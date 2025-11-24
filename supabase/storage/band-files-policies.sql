-- Storage Policies for band-files bucket (Multi-User Band-Scoped Access)
-- Run this after creating the bucket and after migrations 003-004
-- These policies ensure files are scoped to bands and only accessible to band members

-- =============================================================================
-- IMPORTANT: File Path Structure
-- =============================================================================
-- Files MUST be stored with the following path structure:
--   bands/{band_id}/charts/{song_id}/{file_id}.ext
--   bands/{band_id}/audio/{song_id}/{file_id}.ext
--
-- The band_id in the path is used for access control.
-- =============================================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete files" ON storage.objects;

-- =============================================================================
-- NEW BAND-SCOPED POLICIES
-- =============================================================================

-- Policy: Users can upload files to their band's folder
CREATE POLICY "Users can upload files for their band"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'band-files' AND
  -- Extract band_id from path: bands/{band_id}/...
  (storage.foldername(name))[2] IN (
    SELECT band_id::text FROM user_bands WHERE user_id = auth.uid()
  )
);

-- Policy: Users can view/download files from their band's folder
CREATE POLICY "Users can view their band's files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'band-files' AND
  -- Extract band_id from path: bands/{band_id}/...
  (storage.foldername(name))[2] IN (
    SELECT band_id::text FROM user_bands WHERE user_id = auth.uid()
  )
);

-- Policy: Users can update/replace files in their band's folder
CREATE POLICY "Users can update their band's files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'band-files' AND
  -- Extract band_id from path: bands/{band_id}/...
  (storage.foldername(name))[2] IN (
    SELECT band_id::text FROM user_bands WHERE user_id = auth.uid()
  )
);

-- Policy: Users can delete files from their band's folder
CREATE POLICY "Users can delete their band's files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'band-files' AND
  -- Extract band_id from path: bands/{band_id}/...
  (storage.foldername(name))[2] IN (
    SELECT band_id::text FROM user_bands WHERE user_id = auth.uid()
  )
);

-- =============================================================================
-- EXPLANATION
-- =============================================================================

-- The `storage.foldername(name)` function splits a path into an array.
-- For path: "bands/abc-123/charts/song-456/file.pdf"
-- - (storage.foldername(name))[1] = 'bands'
-- - (storage.foldername(name))[2] = 'abc-123' (the band_id)
-- - (storage.foldername(name))[3] = 'charts'
-- etc.

-- The policy checks if the band_id in the path matches one of the bands
-- the authenticated user is a member of (via user_bands table).

-- This ensures:
-- 1. Users can only access files for bands they belong to
-- 2. Files are automatically isolated by band
-- 3. No cross-band data leakage

-- =============================================================================
-- MIGRATING EXISTING FILES (if applicable)
-- =============================================================================

-- If you have existing files stored without the bands/ prefix, you'll need to:
-- 1. Download all files from storage
-- 2. Re-upload them with the new path structure: bands/{band_id}/...
-- 3. Update the `url` fields in your songs.charts and songs.backing_track_url
--
-- This can be done programmatically or manually depending on volume.

-- =============================================================================
-- TESTING THE POLICIES
-- =============================================================================

-- To test that policies work correctly:
-- 1. Log in as a user who is a member of a band
-- 2. Try to upload a file to: bands/{your_band_id}/charts/test/test.pdf
--    - Should succeed
-- 3. Try to upload to: bands/{another_band_id}/charts/test/test.pdf
--    - Should fail with permission denied
-- 4. Try to view a file from your band's folder
--    - Should succeed
-- 5. Try to view a file from another band's folder
--    - Should fail with permission denied
