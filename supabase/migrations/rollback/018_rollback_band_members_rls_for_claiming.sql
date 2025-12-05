-- Rollback Migration: Restore original single update policy for band_members
-- Rolls back: 018_update_band_members_rls_for_claiming.sql
-- Created: 20251205042249

-- Drop the two specialized update policies
DROP POLICY IF EXISTS "Users can claim unclaimed band members" ON band_members;
DROP POLICY IF EXISTS "Users can update band member details" ON band_members;

-- Restore the original broad update policy
CREATE POLICY "Users can update band members"
  ON band_members FOR UPDATE
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

-- Verify rollback
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Verify new policies are gone
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'band_members'
    AND policyname IN (
      'Users can claim unclaimed band members',
      'Users can update band member details'
    );
  
  IF policy_count > 0 THEN
    RAISE EXCEPTION 'Rollback failed: New policies still exist';
  END IF;

  -- Verify old policy is restored
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'band_members'
    AND policyname = 'Users can update band members';
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'Rollback failed: Original policy not restored';
  END IF;

  RAISE NOTICE 'Rollback verification passed: Original RLS policy restored';
END $$;
