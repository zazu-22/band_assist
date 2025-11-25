-- Fix invitation unique constraint to allow re-inviting after cancellation
--
-- PROBLEM: The current constraint UNIQUE(band_id, email, status) prevents:
-- 1. Re-inviting after cancellation (can't have two 'cancelled' rows)
-- 2. Multiple invitation attempts over time
--
-- SOLUTION: Use a partial unique index that only prevents duplicate PENDING
-- invitations. Cancelled/accepted invitations are historical records and
-- can have duplicates.

-- Drop the existing constraint
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_band_id_email_status_key;

-- Create a partial unique index that only applies to pending invitations
-- This allows: multiple cancelled rows, multiple accepted rows (edge case)
-- But prevents: two pending invitations for same email in same band
CREATE UNIQUE INDEX IF NOT EXISTS invitations_band_email_pending_unique
ON invitations (band_id, email)
WHERE status = 'pending';

-- Also add an index to speed up the common query pattern of finding pending invitations
CREATE INDEX IF NOT EXISTS idx_invitations_pending
ON invitations (band_id, email, status)
WHERE status = 'pending';

COMMENT ON INDEX invitations_band_email_pending_unique IS
  'Prevents duplicate pending invitations for the same email in the same band. Allows re-inviting after cancellation.';

-- =============================================================================
-- FUNCTION: Check if email is already a band member
-- =============================================================================

-- Create function to check if an email belongs to an existing band member
-- Uses SECURITY DEFINER to access auth.users (which clients can't query directly)
CREATE OR REPLACE FUNCTION is_email_band_member(p_band_id UUID, p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  is_member BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_bands ub
    JOIN auth.users au ON au.id = ub.user_id
    WHERE ub.band_id = p_band_id
      AND LOWER(au.email) = LOWER(p_email)
  ) INTO is_member;

  RETURN is_member;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_email_band_member(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION is_email_band_member IS
  'Checks if an email address belongs to an existing member of the specified band. Returns true if they are already a member.';
