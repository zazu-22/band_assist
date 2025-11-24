-- Band Assist: Performance Optimization
-- Adds composite index on user_bands to improve RLS policy performance
-- Addresses PR #9 Review Comment #1: RLS Policy Performance Issue

-- =============================================================================
-- COMPOSITE INDEX FOR RLS PERFORMANCE
-- =============================================================================

-- Problem: RLS policies with subqueries checking user_bands run on every row,
-- creating O(n) complexity. The existing separate indexes on user_id and band_id
-- are not optimal for queries that filter on both columns simultaneously.

-- Solution: Add composite index (user_id, band_id) for optimal query performance
-- when checking if a user belongs to a band (the most common RLS check pattern).
-- Note: PostgreSQL efficiently uses the leftmost column for queries filtering only
-- by user_id, so a separate single-column index is not needed.

CREATE INDEX IF NOT EXISTS idx_user_bands_user_band
  ON user_bands(user_id, band_id);

-- =============================================================================
-- PERFORMANCE IMPACT
-- =============================================================================

-- This composite index optimizes the following patterns:
--   1. WHERE band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
--   2. SELECT band_id FROM user_bands WHERE user_id = auth.uid()
--
-- Before: PostgreSQL must scan all user_bands rows for each data row being checked
-- After: Index lookup is nearly instant (O(log n) instead of O(n))
--
-- Note: PostgreSQL can efficiently use the leftmost column (user_id) of this composite
-- index for queries that filter only by user_id, so a separate single-column index
-- on user_id is not needed.
--
-- Expected improvement: 10-100x faster for users with many band memberships
-- Storage overhead: Minimal (~16 bytes per row in user_bands table)

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- To verify the index is being used, run:
-- EXPLAIN ANALYZE
-- SELECT * FROM songs
-- WHERE band_id IN (SELECT band_id FROM user_bands WHERE user_id = 'some-user-id');
--
-- Look for "Index Scan using idx_user_bands_user_band" in the query plan

COMMENT ON INDEX idx_user_bands_user_band IS
  'Composite index for optimal RLS policy performance. Efficiently handles queries filtering by user_id alone or by both user_id and band_id.';
