-- Migration: Fix infinite recursion in band_members RLS policy
-- Fixes PostgreSQL error 42P17: infinite recursion detected in policy
--
-- The issue: Policy "Users can update band member details" (from migration 018)
-- queries band_members within its own WITH CHECK clause, causing infinite
-- recursion when PostgreSQL evaluates the RLS policy.
--
-- The fix: Use a SECURITY DEFINER function to bypass RLS when looking up
-- the current user_id value for comparison.

-- =============================================================================
-- STEP 1: Create a SECURITY DEFINER function to get current user_id
-- This function bypasses RLS, avoiding the recursion
-- =============================================================================

CREATE OR REPLACE FUNCTION get_member_user_id(member_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM band_members WHERE id = member_id;
$$;

-- Restrict execution to authenticated users only
REVOKE ALL ON FUNCTION get_member_user_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_member_user_id(UUID) TO authenticated;

COMMENT ON FUNCTION get_member_user_id IS
  'Securely retrieves the current user_id for a band member. Used by RLS policies to compare old/new values without causing recursion.';

-- =============================================================================
-- STEP 2: Replace the problematic policy
-- =============================================================================

DROP POLICY IF EXISTS "Users can update band member details" ON band_members;

CREATE POLICY "Users can update band member details"
  ON band_members FOR UPDATE
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  )
  WITH CHECK (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
    -- user_id must remain unchanged - use function to avoid recursion
    AND user_id IS NOT DISTINCT FROM get_member_user_id(id)
  );

COMMENT ON POLICY "Users can update band member details" ON band_members IS
  'Allows users to update member details (name, roles, avatar_color) but prevents modifying the user_id linkage. Uses get_member_user_id() to avoid RLS recursion.';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  func_exists BOOLEAN;
  policy_exists BOOLEAN;
BEGIN
  -- Verify function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_member_user_id'
  ) INTO func_exists;

  IF NOT func_exists THEN
    RAISE EXCEPTION 'Migration failed: get_member_user_id function not created';
  END IF;

  -- Verify policy exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'band_members'
      AND policyname = 'Users can update band member details'
  ) INTO policy_exists;

  IF NOT policy_exists THEN
    RAISE EXCEPTION 'Migration failed: Policy not created';
  END IF;

  RAISE NOTICE 'Migration verification passed: RLS recursion fix applied successfully';
END $$;
