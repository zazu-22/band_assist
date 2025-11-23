-- Storage Policies for band-files bucket
-- Run this after creating the bucket in Supabase Dashboard

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'band-files');

-- Allow authenticated users to view/download files
CREATE POLICY "Authenticated users can view files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'band-files');

-- Allow authenticated users to update files (for replace operations)
CREATE POLICY "Authenticated users can update files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'band-files');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'band-files');

-- Note: For the shared band password model, all authenticated users
-- are trusted members of the band and have full access to all files.
-- If you need more granular control (e.g., per-user file ownership),
-- modify these policies to check auth.uid() or custom claims.
