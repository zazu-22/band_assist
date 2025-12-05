-- Migration: Update RLS policies for band_members to support user-member linking
-- Phase 1: Secure claiming functionality with proper RLS policies
-- Created: 20251205042249

-- =============================================================================
-- BAND MEMBERS TABLE - RLS POLICY UPDATES
-- =============================================================================

-- Drop the existing broad update policy
DROP POLICY IF EXISTS "Users can update band members" ON band_members;

-- Create two separate update policies for different use cases:

-- Policy 1: Allow users to claim unclaimed members (set user_id on NULL members)
-- This policy is specifically for the claimMember operation
CREATE POLICY "Users can claim unclaimed band members"
  ON band_members FOR UPDATE
  TO authenticated
  USING (
    -- Member must be in user's band
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
    -- Member must be currently unclaimed
    AND user_id IS NULL
  )
  WITH CHECK (
    -- Member must remain in user's band
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
    -- User can only set user_id to their own ID
    AND user_id = auth.uid()
  );

-- Policy 2: Allow users to update member details (but NOT user_id)
-- This policy is for updating name, roles, avatar_color, etc.
CREATE POLICY "Users can update band member details"
  ON band_members FOR UPDATE
  TO authenticated
  USING (
    -- Member must be in user's band
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  )
  WITH CHECK (
    -- Member must remain in user's band
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
    -- user_id must remain unchanged
    AND (
      user_id IS NOT DISTINCT FROM (
        SELECT user_id FROM band_members WHERE id = band_members.id
      )
    )
  );

-- =============================================================================
-- POLICY DESCRIPTIONS
-- =============================================================================

COMMENT ON POLICY "Users can claim unclaimed band members" ON band_members IS 
  'Allows users to claim (link) unclaimed member records by setting user_id to their own auth.uid(). Prevents claiming already-linked members.';

COMMENT ON POLICY "Users can update band member details" ON band_members IS 
  'Allows users to update member details (name, roles, avatar_color) but prevents modifying the user_id linkage.';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Verify the old policy is gone
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'band_members'
    AND policyname = 'Users can update band members';
  
  IF policy_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: Old update policy still exists';
  END IF;

  -- Verify the new claiming policy exists
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'band_members'
    AND policyname = 'Users can claim unclaimed band members';
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'Migration failed: Claiming policy not created';
  END IF;

  -- Verify the new details update policy exists
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'band_members'
    AND policyname = 'Users can update band member details';
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'Migration failed: Details update policy not created';
  END IF;

  RAISE NOTICE 'Migration verification passed: RLS policies updated successfully';
END $$;
