-- Rollback for Migration 006: Remove Composite Index
-- Run this to revert the composite index on user_bands

-- =============================================================================
-- REMOVE COMPOSITE INDEX
-- =============================================================================

DROP INDEX IF EXISTS idx_user_bands_user_band;

-- =============================================================================
-- NOTES
-- =============================================================================

-- After running this rollback:
-- - RLS policies will still function correctly
-- - Performance will revert to using separate user_id and band_id indexes
-- - Query performance may be slower for RLS policy checks
-- - The original indexes (idx_user_bands_user_id, idx_user_bands_band_id) remain intact
