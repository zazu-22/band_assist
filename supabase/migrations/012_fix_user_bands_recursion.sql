-- Fix infinite recursion in user_bands RLS policy
-- The old policy was querying user_bands within its own USING clause, causing infinite recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view their band memberships" ON user_bands;

-- Recreate with simple, non-recursive logic
-- Users can only view their own band memberships (their own rows in user_bands)
CREATE POLICY "Users can view their band memberships"
  ON user_bands FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
