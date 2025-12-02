# Feature: Collaborative Song Notes

| Field | Value |
| ----- | ----- |
| **Status** | Backlog |
| **Priority** | Medium |
| **Type** | Feature |
| **Created** | 2025-12-02 |

---

## Summary

Enable band members to add timestamped comments and discussion markers to specific song sections, facilitating collaborative feedback and rehearsal notes. These notes are separate from chart annotations (which are per-chart) and provide a conversation layer tied to song sections or timestamps for Guitar Pro files.

## Problem

- Band members cannot leave feedback or questions about specific song sections
- No way to discuss arrangement changes or problem areas collaboratively
- Existing annotations are per-chart and don't support threaded discussions
- Guitar Pro files with playback have no timestamp-based comment system
- Rehearsal insights and decisions get lost in group chats or forgotten

## Proposed Solution

Add a new `song_notes` table and UI component for collaborative commenting:

**Database Schema:**
- `song_notes` table with columns:
  - `id` (uuid, primary key)
  - `song_id` (uuid, foreign key to songs)
  - `author_id` (uuid, foreign key to user_bands.user_id)
  - `content` (text)
  - `timestamp_ms` (integer, nullable - for Guitar Pro playback position)
  - `section_name` (text, nullable - for song parts/sections)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  - `band_id` (uuid, foreign key to bands)

**UI Components:**
- `SongNotesPanel` - Sidebar or collapsible panel in SongDetail view
- Display notes chronologically or grouped by section/timestamp
- Add note button with section/timestamp auto-populated when context available
- Real-time updates using Supabase real-time subscriptions
- Reply/thread support (optional v2 feature)

**Integration Points:**
- SongDetail page: Show notes panel alongside charts
- AlphaTabRenderer: Allow adding timestamp-based notes during playback
- Practice Room: Quick access to add rehearsal notes

## Files Likely Affected

- `src/types.ts` - Add `SongNote` interface
- `src/types/database.types.ts` - Add `song_notes` table definition (generated)
- `src/components/SongDetail.tsx` - Integrate notes panel
- `src/components/notes/SongNotesPanel.tsx` - New component
- `src/components/notes/NoteEditor.tsx` - New component
- `src/components/AlphaTabRenderer.tsx` - Add timestamp capture for notes
- `src/services/supabaseStorageService.ts` - Add CRUD operations for notes
- `supabase/migrations/` - New migration for song_notes table

## Acceptance Criteria

- [ ] Database table created with proper foreign keys and RLS policies
- [ ] Users can add notes to songs with optional timestamp/section references
- [ ] Notes display in chronological order in SongDetail view
- [ ] Timestamp-based notes can be added during AlphaTab playback
- [ ] Section-based notes can be added from song parts dropdown
- [ ] Notes show author name and timestamp
- [ ] Real-time updates: New notes appear without page refresh
- [ ] Users can edit/delete their own notes
- [ ] Notes are scoped to current band (RLS policy enforced)
- [ ] Mobile-responsive notes panel
- [ ] Empty state when no notes exist

## Dependencies

- Supabase real-time subscriptions configured
- User authentication working (for author_id)
- Multi-band support (for band_id scoping)
