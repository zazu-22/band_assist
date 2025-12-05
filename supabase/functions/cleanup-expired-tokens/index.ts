// Scheduled Edge Function to clean up expired file access tokens
// Runs periodically to prevent table bloat from accumulated expired tokens

import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    // SUPABASE_SERVICE_ROLE_KEY is auto-injected by Supabase (legacy JWT format)
    // Used for creating the Supabase client to call database functions
    const supabaseSecretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    // EDGE_SECRET_KEY is our custom secret for authenticating external callers (GitHub Actions)
    // Set via: supabase secrets set EDGE_SECRET_KEY=<your-sb_secret-key>
    const edgeSecretKey = Deno.env.get('EDGE_SECRET_KEY')

    // Verify authentication manually since verify_jwt is disabled in config.toml
    // New Supabase secret keys (sb_secret_...) are not JWTs, so we compare directly
    // See: https://supabase.com/docs/guides/api/api-keys
    const authHeader = req.headers.get('Authorization')
    const providedKey = authHeader?.replace('Bearer ', '')

    if (!edgeSecretKey || !providedKey || providedKey !== edgeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (!supabaseUrl || !supabaseSecretKey) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey)

    // Call the cleanup function
    const { data, error } = await supabase.rpc('cleanup_expired_file_tokens')

    if (error) {
      console.error('Cleanup function error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const deletedCount = data || 0
    console.log(`Successfully cleaned up ${deletedCount} expired tokens`)

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
