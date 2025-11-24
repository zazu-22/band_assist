# Supabase Storage Configuration

## Bucket: `band-files`

This bucket stores all uploaded files for the Band Assist application.

### Manual Setup Steps (Supabase Dashboard)

1. **Create Bucket**:
   - Go to Storage section in Supabase Dashboard
   - Click "New Bucket"
   - Bucket Name: `band-files`
   - Public: **No** (private bucket, requires authentication)
   - Click "Create bucket"

2. **Configure Bucket Settings**:
   - File size limit: 50MB (can be adjusted based on needs)
   - Allowed MIME types: All (will be validated in frontend)

3. **Apply Storage Policies** (see `band-files-policies.sql`):
   - Run the SQL in the SQL Editor to set up access policies

### File Organization

Files are organized by type and song:

```
band-files/
├── charts/
│   └── {songId}/
│       ├── {fileId}.pdf
│       ├── {fileId}.png
│       ├── {fileId}.jpg
│       └── {fileId}.gp
└── audio/
    └── {songId}/
        └── {fileId}.mp3
```

### Supported File Types

#### Charts

- **PDF**: `application/pdf` (sheet music, chord charts)
- **Images**: `image/png`, `image/jpeg` (scanned charts)
- **Guitar Pro**: `application/x-gp3`, `application/x-gp4`, `application/x-gp5`, `audio/gp` (Guitar Pro files)

#### Audio

- **MP3**: `audio/mpeg` (backing tracks)
- **WAV**: `audio/wav`
- **M4A**: `audio/mp4`

### File Size Recommendations

- **Text charts**: Stored in database (not in Storage)
- **Images**: <5MB recommended, optimize before upload
- **PDFs**: <10MB recommended
- **Guitar Pro**: Typically <1MB
- **Audio (backing tracks)**: <20MB recommended (use compressed formats)

### Access Control

All files require authentication:

- Upload: Authenticated users only
- Download: Authenticated users only
- Delete: Authenticated users only

For the shared band password model, all authenticated users have full access to all files.

### Frontend Usage

```typescript
// Upload a file
const { data, error } = await supabase.storage
  .from('band-files')
  .upload(`charts/${songId}/${fileId}.pdf`, fileBlob, {
    contentType: 'application/pdf',
    upsert: false,
  });

// Get public URL (signed for private buckets)
const { data } = await supabase.storage
  .from('band-files')
  .createSignedUrl(`charts/${songId}/${fileId}.pdf`, 3600); // 1 hour expiry

// Download a file
const { data, error } = await supabase.storage
  .from('band-files')
  .download(`charts/${songId}/${fileId}.pdf`);

// Delete a file
const { error } = await supabase.storage
  .from('band-files')
  .remove([`charts/${songId}/${fileId}.pdf`]);
```

### Cleanup Strategy

Files should be deleted when:

1. Parent song is deleted → Delete all files in `charts/{songId}/` and `audio/{songId}/`
2. Specific chart is removed → Delete specific file
3. Backing track is replaced → Delete old file before uploading new

The `SupabaseStorageService` handles cleanup automatically.

### Migration from Base64

During migration from localStorage:

1. Extract Base64 data URIs from `charts[].url` and `backingTrackUrl`
2. Decode Base64 to binary
3. Detect MIME type from data URI
4. Upload to appropriate path in Storage
5. Update database record with new storage URL

### Monitoring & Quotas

**Free Tier Limits:**

- 1GB storage
- 2GB bandwidth/month

**Monitor usage:**

- Supabase Dashboard → Storage → Usage tab
- Track file sizes in `files` table for reporting

**If approaching limits:**

- Clean up old/unused files
- Compress images/audio before upload
- Consider upgrading to paid plan (affordable for band use)
