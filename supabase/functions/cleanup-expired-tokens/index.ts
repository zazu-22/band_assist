// Scheduled Edge Function to clean up expired file access tokens
// Runs periodically to prevent table bloat from accumulated expired tokens

import { createClient } from 'jsr:@supabase/supabase-js@2'

// TEMPORARY: Debug mode for issue #114 investigation
// Enable via: supabase secrets set DEBUG_MODE=true
// Remove after issue is resolved
const DEBUG_MODE = Deno.env.get('DEBUG_MODE') === 'true'

function debugLog(category: string, data: Record<string, unknown>) {
  if (!DEBUG_MODE) return
  console.log(JSON.stringify({ debug: true, category, ...data, timestamp: new Date().toISOString() }))
}

Deno.serve(async (req) => {
  try {
    // Debug: Log received headers (only when DEBUG_MODE is enabled)
    if (DEBUG_MODE) {
      const headerSummary: Record<string, string> = {}
      req.headers.forEach((value, key) => {
        // Only log existence and length, never actual values
        headerSummary[key] = `[${value.length} chars]`
      })
      debugLog('headers', { received: headerSummary })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    // SUPABASE_SERVICE_ROLE_KEY is auto-injected by Supabase (new auth uses SUPABASE_SECRET_KEY)
    // Used for creating the Supabase client to call database functions
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const secretKey = Deno.env.get('SUPABASE_SECRET_KEY')
    const supabaseSecretKey = serviceRoleKey || secretKey
    const supabaseKeySource = serviceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY' : secretKey ? 'SUPABASE_SECRET_KEY' : 'none'
    debugLog('supabase_key', { source: supabaseKeySource, keySet: !!supabaseSecretKey })
    // EDGE_SECRET_KEY is our custom secret for authenticating external callers (GitHub Actions)
    // Set via: supabase secrets set EDGE_SECRET_KEY=<your-secret>
    const edgeSecretKey = Deno.env.get('EDGE_SECRET_KEY')

    // Verify authentication manually since verify_jwt is disabled in config.toml
    // Use custom header x-edge-secret with a random secret (not sb_secret_... format)
    // to avoid Supabase's header value filtering that blocks API key patterns
    const providedKey = req.headers.get('x-edge-secret')

    // Debug: Log auth status (only when DEBUG_MODE is enabled)
    debugLog('auth', {
      edgeSecretKeySet: !!edgeSecretKey,
      edgeSecretKeyLength: edgeSecretKey?.length ?? 0,
      providedKeySet: !!providedKey,
      providedKeyLength: providedKey?.length ?? 0,
      keysMatch: providedKey === edgeSecretKey
    })

    if (!edgeSecretKey || !providedKey || providedKey !== edgeSecretKey) {
      debugLog('auth_failed', {
        reason: !edgeSecretKey ? 'edge_secret_not_configured' : !providedKey ? 'header_missing' : 'key_mismatch'
      })
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    debugLog('auth_success', { method: 'x-edge-secret' })

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
