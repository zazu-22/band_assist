# Supabase Database Schema

This document describes the database schema for the Band Assist backend using Supabase (PostgreSQL).

## Design Principles

1. **Hybrid Approach**: Core entities in separate tables, nested data in JSONB columns
2. **Minimal Migration**: Keep structure close to current localStorage format
3. **Real-time Ready**: All tables support Supabase real-time subscriptions
4. **File Storage**: Separate file storage in Supabase Storage, URLs referenced in database

## Tables

### `band_members`

Stores band roster information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique member identifier |
| `name` | TEXT | NOT NULL | Member's display name |
| `roles` | TEXT[] | NOT NULL DEFAULT '{}' | Preferred instruments/roles |
| `avatar_color` | TEXT | | Color for UI avatars (hex code) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Last update timestamp |

**Indexes:**

- Primary key on `id`

---

### `songs`

Stores song information with nested data in JSONB.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique song identifier |
| `title` | TEXT | NOT NULL | Song title |
| `artist` | TEXT | NOT NULL | Artist/composer name |
| `duration` | TEXT | | Song duration (e.g., "3:45") |
| `bpm` | INTEGER | | Beats per minute |
| `key` | TEXT | | Musical key (e.g., "Am", "C") |
| `is_original` | BOOLEAN | NOT NULL DEFAULT FALSE | Original composition flag |
| `status` | TEXT | NOT NULL | "To Learn", "In Progress", or "Performance Ready" |
| `target_date` | DATE | | Target date for learning completion |
| `charts` | JSONB | NOT NULL DEFAULT '[]' | Array of SongChart objects |
| `assignments` | JSONB | NOT NULL DEFAULT '[]' | Array of Assignment objects |
| `parts` | JSONB | NOT NULL DEFAULT '[]' | Array of SongPart objects |
| `backing_track_url` | TEXT | | Signed Storage URL for backing track audio file |
| `backing_track_storage_path` | TEXT | | Storage bucket path (audio/{songId}/{fileId}.ext) |
| `ai_analysis` | TEXT | | AI-generated practice tips |
| `lyrics` | TEXT | | Song lyrics (legacy field) |
| `sort_order` | INTEGER | | Position in setlist view (NULL = not ordered) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Last update timestamp |

**JSONB Structures:**

**`charts`** array contains:

```json
{
  "id": "uuid",
  "name": "Bass Tab",
  "instrument": "Bass",
  "type": "TEXT|IMAGE|PDF|GP",
  "content": "text content for TEXT type",
  "url": "signed-storage-url OR base64-data-uri",
  "storagePath": "charts/{songId}/{fileId}.{ext} (for Storage files)",
  "storageBase64": "base64-data-uri (GP files only, for AlphaTab rendering)",
  "annotations": [
    {
      "id": "uuid",
      "lineIndex": 5,
      "text": "Watch timing here",
      "color": "yellow|red|blue|green"
    }
  ]
}
```

**Note on file storage:**
- `TEXT` charts: Use `content` field for raw text/tablature
- `IMAGE`/`PDF`/`GP` charts: Files are uploaded to Supabase Storage (`band-files` bucket)
- `url` contains signed Storage URL (1-year expiry) or base64 data URI for fallback
- `storagePath` tracks the bucket path for file management
- `storageBase64` stores base64 copy for GP files (AlphaTab requires binary data)

**`assignments`** array contains:

```json
{
  "memberId": "uuid",
  "role": "Lead Guitar"
}
```

**`parts`** array contains:

```json
{
  "id": "uuid",
  "name": "Intro",
  "instrument": "Lead Guitar",
  "content": "tab or notation",
  "assignedToMemberId": "uuid (optional)"
}
```

**Indexes:**

- Primary key on `id`
- GIN index on `charts` for JSONB queries
- Index on `status` for filtering
- Index on `title` for search
- Partial index on `sort_order` (WHERE sort_order IS NOT NULL) for setlist ordering

---

### `band_events`

Stores practice schedule, gigs, and other events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique event identifier |
| `title` | TEXT | NOT NULL | Event name/description |
| `date` | DATE | NOT NULL | Event date |
| `time` | TIME | | Event time (optional) |
| `type` | TEXT | NOT NULL | "PRACTICE", "GIG", or "OTHER" |
| `location` | TEXT | | Venue or location |
| `notes` | TEXT | | Additional notes |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Last update timestamp |

**Indexes:**

- Primary key on `id`
- Index on `date` for chronological queries
- Index on `type` for filtering

---

### `roles`

Simple lookup table for available instrument/role options.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique role identifier |
| `name` | TEXT | UNIQUE NOT NULL | Role name (e.g., "Lead Guitar") |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Record creation timestamp |

**Indexes:**

- Primary key on `id`
- Unique constraint on `name`

---

### `files` (metadata table)

Tracks uploaded files stored in Supabase Storage.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique file identifier |
| `storage_path` | TEXT | NOT NULL | Path in Supabase Storage bucket |
| `file_name` | TEXT | NOT NULL | Original filename |
| `mime_type` | TEXT | NOT NULL | MIME type (e.g., "application/pdf") |
| `file_size` | BIGINT | NOT NULL | File size in bytes |
| `uploaded_by` | TEXT | | User identifier (for future multi-user) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Upload timestamp |

**Indexes:**

- Primary key on `id`
- Index on `storage_path` for lookups

---

## Storage Buckets

### `band-files`

Stores all uploaded files (PDFs, images, audio, Guitar Pro files).

**Configuration:**

- Public: No (requires authentication)
- Max file size: 50MB (configurable)
- Allowed MIME types:
  - `application/pdf`
  - `image/*`
  - `audio/*`
  - `application/x-gp*` (Guitar Pro files)

**Path structure:**

```
/charts/{songId}/{fileId}.{ext}     - Chart files (PDF, images, GP)
/audio/{songId}/{fileId}.{ext}      - Backing tracks
```

---

## Row Level Security (RLS) Policies

For the "simple password" auth model, we'll use a shared band account approach:

1. **All tables**:
   - Enable RLS
   - Policy: `authenticated` role can SELECT, INSERT, UPDATE, DELETE
   - No policies for `anon` role (must be logged in)

2. **Storage bucket**:
   - Policy: `authenticated` users can upload/download files

---

## Real-time Subscriptions

Enable real-time for collaborative editing:

```sql
-- Enable real-time on all tables
ALTER PUBLICATION supabase_realtime ADD TABLE band_members;
ALTER PUBLICATION supabase_realtime ADD TABLE songs;
ALTER PUBLICATION supabase_realtime ADD TABLE band_events;
ALTER PUBLICATION supabase_realtime ADD TABLE roles;
```

Frontend can subscribe to changes:

```typescript
supabase
  .channel('band-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'songs'
  }, handleSongUpdate)
  .subscribe()
```

---

## Setlist Ordering

The `sort_order` column enables persistent song ordering for the setlist view:

- **NULL values**: Songs with `sort_order = NULL` are not in the setlist or have no specific order
- **Ordering**: When loading songs, order by `sort_order ASC NULLS LAST, title ASC`
- **Drag-and-drop**: When users reorder songs in SetlistManager, update `sort_order` to match array indices
- **Sync across users**: Real-time subscriptions ensure all users see the same song order

**Example query:**
```sql
SELECT * FROM songs
ORDER BY sort_order ASC NULLS LAST, title ASC;
```

This ensures:
1. Songs with `sort_order` appear first, in order
2. Songs without `sort_order` appear after, alphabetically

---

## Data Import from JSON Backups

The app supports importing data from JSON backup files:

1. **File uploads**: PDF, image, and Guitar Pro files in the backup are uploaded to Supabase Storage
2. **URL conversion**: Base64 data URIs are converted to Storage URLs
3. **Dual storage for GP**: Guitar Pro files store both Storage URL (for downloads) and base64 (for AlphaTab rendering)
4. **JSONB preservation**: Nested structures (charts, assignments, parts) are stored as-is

**Import flow:**
- User selects JSON backup file in Settings
- App reads file and validates format
- Files are extracted and uploaded to Storage
- Data is inserted into Supabase tables
- Real-time sync propagates changes to all users

---

## Database Functions

### `update_updated_at_column()`

Trigger function to automatically update `updated_at` timestamp:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';
```

Applied to all tables with `updated_at` column.

---

## Backup Strategy

1. **Supabase automatic backups**: Enabled in project settings (daily for free tier)
2. **Client-side export**: Keep existing JSON export feature as user-accessible backup
3. **Point-in-time recovery**: Available on paid plans if needed

---

## Performance Considerations

1. **JSONB Indexing**: GIN indexes on `songs.charts` for fast queries
2. **Pagination**: Implement cursor-based pagination for song lists (20-50 per page)
3. **File CDN**: Supabase Storage uses global CDN for fast file delivery
4. **Connection Pooling**: Supabase handles automatically (60 connections on free tier)

---

## Future Enhancements (Not in Initial Implementation)

1. **User Accounts**: Replace shared password with individual accounts
2. **Setlists Table**: Currently not stored in localStorage; add when feature is used
3. **Activity Log**: Track who changed what (audit trail)
4. **Full-text Search**: PostgreSQL full-text search on song titles/artists
5. **File Versioning**: Keep history of chart/file uploads
