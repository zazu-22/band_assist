// Supabase Edge Function: Send Invitation Email
// Triggered by database webhook when a new invitation is created
//
// Required secrets (set via Supabase Dashboard > Settings > Edge Functions > Secrets):
// - RESEND_API_KEY: Your Resend API key
// - APP_URL: Your app's base URL (e.g., https://band-assist.vercel.app)
// - EMAIL_FROM: From address (e.g., "Band Assist <noreply@yourdomain.com>")
//
// Auto-injected by Supabase:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Validate required environment variables at startup
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:3000';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'Band Assist <noreply@example.com>';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: {
    id: string;
    band_id: string;
    email: string;
    invited_by: string;
    status: string;
    invited_at: string;
  } | null;
  old_record: unknown;
}

/**
 * Escapes HTML special characters to prevent XSS attacks in email templates.
 * This is critical since band names and emails are user-provided.
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes text for use in email subject lines.
 * Removes control characters and newlines that could cause issues.
 */
function sanitizeForSubject(str: string): string {
  return str.replace(/[\r\n\t\x00-\x1F]/g, ' ').trim();
}

/**
 * Basic email validation to catch obviously invalid addresses.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validates that a webhook payload has all required fields for an invitation.
 */
function validatePayload(
  record: WebhookPayload['record']
): record is NonNullable<WebhookPayload['record']> {
  if (!record) return false;
  const { email, band_id, invited_by } = record;
  return Boolean(email && band_id && invited_by);
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Validate required environment variables
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY secret is not set');
    return new Response(
      JSON.stringify({ error: 'Server configuration error: missing RESEND_API_KEY' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables');
    return new Response(
      JSON.stringify({ error: 'Server configuration error: missing Supabase credentials' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const payload: WebhookPayload = await req.json();

    // Only process INSERT events on invitations table
    if (payload.type !== 'INSERT') {
      return new Response(JSON.stringify({ skipped: true, reason: 'Not an INSERT event' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate payload has required fields
    if (!validatePayload(payload.record)) {
      console.error('Invalid payload: missing required fields', payload.record);
      return new Response(JSON.stringify({ error: 'Invalid payload: missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { email, band_id, invited_by } = payload.record;

    // Validate email format before attempting to send
    if (!isValidEmail(email)) {
      console.error('Invalid email address in payload:', email);
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with service role for admin access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Look up band name - fail if we can't get it (indicates RLS or DB issue)
    const { data: band, error: bandError } = await supabase
      .from('bands')
      .select('name')
      .eq('id', band_id)
      .single();

    if (bandError) {
      console.error('Error fetching band:', bandError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch band details', details: bandError.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const bandName = band?.name || 'your band';

    // Look up inviter's email
    const { data: inviter } = await supabase.auth.admin.getUserById(invited_by);
    const inviterEmail = inviter?.user?.email || 'A band member';

    // Escape user-provided content to prevent XSS in email clients
    const safeBandName = escapeHtml(bandName);
    const safeInviterEmail = escapeHtml(inviterEmail);
    const safeRecipientEmail = escapeHtml(email);

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [email],
        subject: `You've been invited to join ${sanitizeForSubject(bandName)} on Band Assist`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #18181b; font-size: 24px; margin-bottom: 16px;">
              You're invited to join ${safeBandName}!
            </h1>

            <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">
              ${safeInviterEmail} has invited you to collaborate on <strong>${safeBandName}</strong> using Band Assist.
            </p>

            <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">
              Band Assist helps bands manage songs, charts, setlists, and practice schedules all in one place.
            </p>

            <div style="margin: 32px 0;">
              <a href="${APP_URL}"
                 style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Accept Invitation
              </a>
            </div>

            <p style="color: #71717a; font-size: 14px; line-height: 1.6;">
              Sign up or log in with <strong>${safeRecipientEmail}</strong> to automatically join the band.
            </p>

            <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />

            <p style="color: #a1a1aa; font-size: 12px;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        `,
        text: `You're invited to join ${bandName}!

${inviterEmail} has invited you to collaborate on ${bandName} using Band Assist.

Band Assist helps bands manage songs, charts, setlists, and practice schedules all in one place.

Accept your invitation: ${APP_URL}

Sign up or log in with ${email} to automatically join the band.

If you didn't expect this invitation, you can safely ignore this email.`,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('Resend API error:', errorText);
      return new Response(JSON.stringify({ error: 'Email send failed', details: errorText }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await resendResponse.json();
    console.log('Invitation email sent:', { to: email, band: bandName, emailId: result.id });

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing invitation:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
