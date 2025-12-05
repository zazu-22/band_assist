// Scheduled Edge Function to clean up expired file access tokens
// Runs periodically to prevent table bloat from accumulated expired tokens

import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    // === DEBUG: Log all received headers ===
    const headersObj: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      // Mask sensitive values but show they exist
      if (key.toLowerCase().includes('secret') || key.toLowerCase().includes('auth') || key.toLowerCase() === 'apikey') {
        headersObj[key] = value ? `[SET: ${value.length} chars]` : '[NOT SET]'
      } else {
        headersObj[key] = value
      }
    })
    console.log('=== DEBUG: Received headers ===')
    console.log(JSON.stringify(headersObj, null, 2))
    // === END DEBUG ===

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    // SUPABASE_SERVICE_ROLE_KEY is auto-injected by Supabase (new auth uses SUPABASE_SECRET_KEY)
    // Used for creating the Supabase client to call database functions
    const supabaseSecretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
    // EDGE_SECRET_KEY is our custom secret for authenticating external callers (GitHub Actions)
    // Set via: supabase secrets set EDGE_SECRET_KEY=<your-secret>
    const edgeSecretKey = Deno.env.get('EDGE_SECRET_KEY')

    // === DEBUG: Log env var status ===
    console.log('=== DEBUG: Environment variables ===')
    console.log(`SUPABASE_URL: ${supabaseUrl ? '[SET]' : '[NOT SET]'}`)
    console.log(`SUPABASE_SERVICE_ROLE_KEY: ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? '[SET]' : '[NOT SET]'}`)
    console.log(`SUPABASE_SECRET_KEY: ${Deno.env.get('SUPABASE_SECRET_KEY') ? '[SET]' : '[NOT SET]'}`)
    console.log(`EDGE_SECRET_KEY: ${edgeSecretKey ? `[SET: ${edgeSecretKey.length} chars]` : '[NOT SET]'}`)
    // === END DEBUG ===

    // Verify authentication manually since verify_jwt is disabled in config.toml
    // Use custom header x-edge-secret with a random secret (not sb_secret_... format)
    // to avoid Supabase's header value filtering that blocks API key patterns
    const providedKey = req.headers.get('x-edge-secret')

    // === DEBUG: Auth comparison ===
    console.log('=== DEBUG: Auth check ===')
    console.log(`x-edge-secret header received: ${providedKey ? `[SET: ${providedKey.length} chars]` : '[NOT SET]'}`)
    console.log(`Keys match: ${providedKey === edgeSecretKey}`)
    // === END DEBUG ===

    if (!edgeSecretKey || !providedKey || providedKey !== edgeSecretKey) {
      console.log('=== DEBUG: Auth FAILED ===')
      console.log(`Reason: ${!edgeSecretKey ? 'EDGE_SECRET_KEY not set' : !providedKey ? 'x-edge-secret header missing' : 'keys do not match'}`)
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
