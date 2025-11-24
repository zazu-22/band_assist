-- Rollback for Migration 007: Remove Rate Limiting
-- Run this to revert the invitation rate limiting feature

-- =============================================================================
-- REMOVE INDEX
-- =============================================================================

DROP INDEX IF EXISTS idx_invitations_invited_at;

-- =============================================================================
-- REMOVE FUNCTION
-- =============================================================================

DROP FUNCTION IF EXISTS check_invitation_rate_limit(UUID);

-- =============================================================================
-- NOTES
-- =============================================================================

-- After running this rollback:
-- - Invitations can be created without rate limiting
-- - The application will need to implement client-side rate limiting if desired
-- - No data is lost - all existing invitations remain intact
