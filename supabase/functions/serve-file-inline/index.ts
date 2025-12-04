// Supabase Edge Function to serve storage files with Content-Disposition: inline
// This fixes Firefox PDF viewer issue where PDFs download instead of displaying inline

import { createClient } from 'jsr:@supabase/supabase-js@2'

// Token reuse grace period for PDF viewer reloads (30 seconds)
// PDF viewers may pre-fetch, reload on zoom/scroll, or re-request for print dialog
const TOKEN_REUSE_GRACE_PERIOD_MS = 30 * 1000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get storage path from URL parameter
    const url = new URL(req.url)
    const storagePath = url.searchParams.get('path')

    if (!storagePath) {
      return new Response(
        JSON.stringify({ error: 'Missing path parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get file access token from URL parameter (for iframe compatibility)
    const tokenParam = url.searchParams.get('token')
    if (!tokenParam) {
      return new Response(
        JSON.stringify({ error: 'Missing token parameter' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Use service role to validate token and access storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate file access token
    // This token is short-lived (5 min) and single-use, providing better security than JWT in URL
    const { data: tokenData, error: tokenError } = await supabase
      .from('file_access_tokens')
      .select('id, user_id, storage_path, band_id, expires_at, used_at')
      .eq('token', tokenParam)
      .single()

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check token hasn't expired
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ error: 'Token has expired' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify the storage path matches the token's path (path-based authorization)
    if (storagePath !== tokenData.storage_path) {
      return new Response(
        JSON.stringify({ error: 'Token is not valid for this file' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify user has access to this band
    // Storage paths are in format: bands/{band_id}/charts/{song_id}/{file_id}.ext
    const pathSegments = storagePath.split('/')
    if (pathSegments.length < 2 || pathSegments[0] !== 'bands') {
      return new Response(
        JSON.stringify({ error: 'Invalid storage path format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const pathBandId = pathSegments[1]
    if (pathBandId !== tokenData.band_id) {
      return new Response(
        JSON.stringify({ error: 'File does not belong to the authorized band' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if token was already used
    if (tokenData.used_at) {
      // Allow reuse within grace period for PDF viewer reloads
      const usedAt = new Date(tokenData.used_at)
      if (now.getTime() - usedAt.getTime() > TOKEN_REUSE_GRACE_PERIOD_MS) {
        return new Response(
          JSON.stringify({ error: 'Token has already been used' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      // Allow re-use within grace period - skip marking as used again
    } else {
      // First use: atomically mark token as used
      // Uses compare-and-swap to prevent race conditions: only updates if used_at is still NULL
      const { data: updateResult, error: updateError } = await supabase
        .from('file_access_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id)
        .is('used_at', null)  // Only update if still unused (atomic CAS)
        .select()
        .single()

      if (updateError || !updateResult) {
        // Token was already used by another concurrent request - check grace period
        const { data: recheckToken } = await supabase
          .from('file_access_tokens')
          .select('used_at')
          .eq('id', tokenData.id)
          .single()

        if (recheckToken?.used_at) {
          const usedAt = new Date(recheckToken.used_at)
          if (now.getTime() - usedAt.getTime() > TOKEN_REUSE_GRACE_PERIOD_MS) {
            return new Response(
              JSON.stringify({ error: 'Token has already been used' }),
              {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
        }
      }
    }

    // Download file from storage
    const { data, error } = await supabase.storage
      .from('band-files')
      .download(storagePath)

    if (error) {
      console.error('Storage download error:', error)
      return new Response(
        JSON.stringify({ error: 'File not found or access denied' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get content type from file extension
    const extension = storagePath.split('.').pop()?.toLowerCase() || ''
    const contentTypeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'gp': 'application/octet-stream',
      'gp3': 'application/octet-stream',
      'gp4': 'application/octet-stream',
      'gp5': 'application/octet-stream',
      'gpx': 'application/octet-stream',
    }
    const contentType = contentTypeMap[extension] || 'application/octet-stream'

    // Return file with Content-Disposition: inline header
    return new Response(data, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': 'inline', // This is the key header that fixes Firefox!
        // No cache - each URL has a unique token and tokens are short-lived (5 min)
        'Cache-Control': 'private, no-store',
      },
    })

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/* To invoke:

  GET https://your-project.supabase.co/functions/v1/serve-file-inline?path=bands/xxx/charts/xxx/file.pdf

*/
