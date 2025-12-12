-- Migration: Add RLS policy for user-member unlinking
-- Allows users to unlink themselves from a band member record
-- Created: 20251212

-- =============================================================================
-- BAND MEMBERS TABLE - ADD UNLINK POLICY
-- =============================================================================

-- Policy: Allow users to unlink themselves (set user_id to NULL)
-- This policy is specifically for the unlinkMember operation
CREATE POLICY "Users can unlink themselves from band members"
  ON band_members FOR UPDATE
  TO authenticated
  USING (
    -- Member must be in user's band
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
    -- Member must be currently linked to this user
    AND user_id = auth.uid()
  )
  WITH CHECK (
    -- Member must remain in user's band
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
    -- user_id must be set to NULL (unlinking)
    AND user_id IS NULL
  );

-- =============================================================================
-- POLICY DESCRIPTION
-- =============================================================================

COMMENT ON POLICY "Users can unlink themselves from band members" ON band_members IS
  'Allows users to unlink (remove association) from their linked member record by setting user_id to NULL. Users can only unlink themselves, not other users.';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Verify the unlink policy exists
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'band_members'
    AND policyname = 'Users can unlink themselves from band members';

  IF policy_count = 0 THEN
    RAISE EXCEPTION 'Migration failed: Unlink policy not created';
  END IF;

  RAISE NOTICE 'Migration verification passed: Unlink policy created successfully';
END $$;
