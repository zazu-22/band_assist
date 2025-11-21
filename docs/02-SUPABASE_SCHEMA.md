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
| `backing_track_url` | TEXT | | URL to backing track file in Storage |
| `ai_analysis` | TEXT | | AI-generated practice tips |
| `lyrics` | TEXT | | Song lyrics (legacy field) |
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
  "url": "storage-url-for-files",
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

## Migration from localStorage

The `SupabaseStorageService` will handle:

1. **UUID Generation**: Current app uses client-generated IDs (likely `Date.now()` or similar). Migration will preserve IDs if they're UUID format, otherwise generate new UUIDs and maintain ID mapping.

2. **File Extraction**: Base64 data URIs in `charts[].url` and `backingTrackUrl` will be:
   - Decoded from Base64
   - Uploaded to Supabase Storage
   - Replaced with storage URLs

3. **JSONB Conversion**: Nested arrays (charts, assignments, parts) will be stored as-is in JSONB columns.

4. **Legacy Field Handling**: `tabContent`, `tabUrl`, `annotations`, `lyrics` are already migrated to `charts` array by localStorage migration (storageService.ts:39-69), so new backend won't store these separately.

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
