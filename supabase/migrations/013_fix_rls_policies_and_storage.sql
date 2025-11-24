-- Consolidated RLS Policy Fixes and Storage Configuration
-- This migration includes all the fixes made during deployment troubleshooting

-- =============================================================================
-- 1. FIX BANDS TABLE POLICIES
-- =============================================================================

-- Drop temporary test policy
DROP POLICY IF EXISTS "temp_test_allow_all" ON bands;
DROP POLICY IF EXISTS "temp_allow_authenticated_inserts" ON bands;

-- Fix SELECT policy to allow viewing bands you created (even before joining user_bands)
DROP POLICY IF EXISTS "Users can view their bands" ON bands;
CREATE POLICY "Users can view their bands" ON bands
  FOR SELECT
  TO authenticated
  USING (
    -- Can view bands you're a member of
    id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
    OR
    -- Can view bands you created (even if not yet in user_bands)
    created_by = auth.uid()
  );

-- Create proper INSERT policy
DROP POLICY IF EXISTS "Users can create bands" ON bands;
CREATE POLICY "Users can create bands" ON bands
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- =============================================================================
-- 2. FIX ROLES TABLE UNIQUE CONSTRAINT
-- =============================================================================

-- Drop old unique constraint on name only
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_key;

-- Create composite unique constraint allowing each band to have its own roles
-- NULLS NOT DISTINCT ensures global roles (band_id IS NULL) have unique names
ALTER TABLE roles ADD CONSTRAINT roles_name_band_id_key
  UNIQUE NULLS NOT DISTINCT (name, band_id);

-- =============================================================================
-- 3. ADD STORAGE POLICIES FOR BAND-FILES BUCKET
-- =============================================================================

-- Allow authenticated users to upload files to their band's folder
CREATE POLICY "Users can upload to their band folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'band-files'
  AND (storage.foldername(name))[1] = 'bands'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT band_id FROM user_bands WHERE user_id = auth.uid()
  )
);

-- Allow users to view files from their bands
CREATE POLICY "Users can view their band files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'band-files'
  AND (storage.foldername(name))[1] = 'bands'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT band_id FROM user_bands WHERE user_id = auth.uid()
  )
);

-- Allow users to delete files from their bands
CREATE POLICY "Users can delete their band files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'band-files'
  AND (storage.foldername(name))[1] = 'bands'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT band_id FROM user_bands WHERE user_id = auth.uid()
  )
);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON POLICY "Users can view their bands" ON bands IS
  'Users can view bands they are members of OR bands they created (to handle race condition during band creation)';

COMMENT ON POLICY "Users can create bands" ON bands IS
  'Users can create bands where they are the creator';

COMMENT ON CONSTRAINT roles_name_band_id_key ON roles IS
  'Each band can have its own set of roles. Global roles (band_id IS NULL) must have unique names.';
