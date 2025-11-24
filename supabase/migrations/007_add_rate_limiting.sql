-- Band Assist: Invitation Rate Limiting
-- Adds rate limiting to prevent invitation abuse
-- Addresses PR #9 Review Comment #2: Missing Rate Limiting

-- =============================================================================
-- RATE LIMITING FUNCTION
-- =============================================================================

-- Function to check if a band has exceeded the invitation rate limit
-- Limit: 10 invitations per hour per band

CREATE OR REPLACE FUNCTION check_invitation_rate_limit(p_band_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  invitation_count INTEGER;
  rate_limit INTEGER := 10;
BEGIN
  -- Count PENDING invitations created in the last hour for this band
  -- Only count pending to prevent bypass via cancellation
  SELECT COUNT(*)
  INTO invitation_count
  FROM invitations
  WHERE band_id = p_band_id
    AND invited_at > (NOW() - INTERVAL '1 hour')
    AND status = 'pending';

  -- Return true if under limit, false if over
  RETURN invitation_count < rate_limit;
END;
$$;

-- =============================================================================
-- PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Add index on invited_at to speed up rate limit checks
CREATE INDEX IF NOT EXISTS idx_invitations_invited_at
  ON invitations(band_id, invited_at DESC)
  WHERE status = 'pending';

-- =============================================================================
-- USAGE
-- =============================================================================

-- The application SHOULD check the rate limit before creating invitations
-- to provide fast, friendly feedback to users:
--
-- In TypeScript/JavaScript:
-- const { data: canInvite } = await supabase
--   .rpc('check_invitation_rate_limit', { p_band_id: bandId });
--
-- if (!canInvite) {
--   // Show error: "Rate limit exceeded. Maximum 10 invitations per hour."
--   return;
-- }
--
-- // Proceed with invitation insert
-- await supabase.from('invitations').insert({ ... });
--
-- NOTE: This RPC function provides application-level UX (fast feedback).
-- Actual security enforcement is done via database trigger (see migration 010)
-- which runs atomically with INSERT to prevent TOCTOU race conditions.

COMMENT ON FUNCTION check_invitation_rate_limit IS
  'Checks if a band has exceeded the invitation rate limit (10 pending invitations per hour). Returns true if under limit. Recommended for application-level UX (fast feedback). Actual enforcement is via database trigger (migration 010).';
