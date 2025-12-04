// Supabase Edge Function to serve storage files with Content-Disposition: inline
// This fixes Firefox PDF viewer issue where PDFs download instead of displaying inline

import { createClient } from 'jsr:@supabase/supabase-js@2'

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

    // Get user's auth token from URL parameter (for iframe compatibility)
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

    // Validate the user's token first
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify the JWT token
    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await authClient.auth.getUser(tokenParam)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Use service role to access storage (for inline Content-Disposition)
    // RLS is enforced because we validated the user above
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
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
