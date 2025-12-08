-- Band Assist: Atomic Band Creation Function
-- Creates band and user_bands entries in a single transaction to avoid orphaned bands
-- Uses SECURITY DEFINER to bypass RLS during rollback cleanup

-- =============================================================================
-- CREATE BAND FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION create_band_with_admin(
  p_band_name TEXT
)
RETURNS TABLE (
  band_id UUID,
  band_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_band_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create the band
  INSERT INTO bands (name, created_by)
  VALUES (p_band_name, v_user_id)
  RETURNING id, created_at INTO v_band_id, v_created_at;

  -- Add creator as admin (this is in the same transaction, so it atomically succeeds or fails)
  INSERT INTO user_bands (user_id, band_id, role)
  VALUES (v_user_id, v_band_id, 'admin');

  -- Return the created band info
  RETURN QUERY SELECT v_band_id, p_band_name, v_created_at;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_band_with_admin(TEXT) TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION create_band_with_admin IS
  'Atomically creates a new band and adds the authenticated user as admin. '
  'Uses SECURITY DEFINER to ensure both operations succeed or fail together, '
  'preventing orphaned bands that cannot be cleaned up due to RLS policies.';
