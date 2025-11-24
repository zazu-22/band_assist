-- Fix Rate Limiting Implementation
-- Removes the problematic CHECK constraint added in migration 007
-- and updates the function to only count pending invitations

-- =============================================================================
-- REMOVE PROBLEMATIC CONSTRAINT
-- =============================================================================

-- The CHECK constraint causes production failures due to TOCTOU race conditions
-- Rate limiting should be enforced at the application layer, not database constraints
ALTER TABLE invitations
  DROP CONSTRAINT IF EXISTS check_rate_limit;

-- =============================================================================
-- UPDATE FUNCTION
-- =============================================================================

-- Update function to SECURITY INVOKER and only count pending invitations
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

COMMENT ON FUNCTION check_invitation_rate_limit IS
  'Checks if a band has exceeded the invitation rate limit (10 pending invitations per hour). Returns true if under limit. Must be called by application before creating invitations.';
