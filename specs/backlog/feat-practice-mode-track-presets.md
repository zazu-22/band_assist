# Feature: Practice Mode Track Presets

| Field | Value |
| ----- | ----- |
| **Status** | Backlog |
| **Priority** | Medium |
| **Type** | Feature |
| **Created** | 2025-12-02 |

---

## Summary

Allow users to save and quickly recall custom track mute/solo configurations for Guitar Pro files in Practice Room. This enables one-click switching between practice scenarios like "Bass Practice" (mute bass, solo drums) or "Full Mix" (all tracks unmuted).

## Problem

- Users must manually mute/unmute tracks every practice session
- No way to save preferred practice configurations
- Switching between practice modes (e.g., "play with bass" vs "no bass") requires multiple clicks
- Each band member has different practice needs but shares the same song file
- AlphaTab track controls exist but state isn't persisted

## Proposed Solution

Add user-specific practice presets that store track configurations per song:

**Database Schema:**
- `practice_presets` table:
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `song_id` (uuid, foreign key to songs)
  - `preset_name` (text, e.g., "Bass Practice", "Full Mix")
  - `track_config` (jsonb) - Array of `{ trackIndex: number, isMute: boolean, isSolo: boolean }`
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  - Unique constraint on (user_id, song_id, preset_name)

**UI Components:**
- `PresetSelector` dropdown in PracticeControlBar (when Guitar Pro file active)
- "Save Current as Preset" button to capture current track state
- "Manage Presets" dialog to rename/delete saved presets
- Visual indicator showing active preset (if any)

**Functionality:**
- Auto-save last used configuration per song (implicit "Last Used" preset)
- Quick-select from dropdown to instantly apply saved track config
- Preset applies to AlphaTab track mute/solo state
- User-scoped (different users can have different presets for same song)

## Files Likely Affected

- `src/types.ts` - Add `PracticePreset` and `TrackConfig` interfaces
- `src/types/database.types.ts` - Add `practice_presets` table (generated)
- `src/components/PracticeRoom.tsx` - State management for presets
- `src/components/practice/PracticeControlBar.tsx` - Add preset selector UI
- `src/components/practice/PresetManager.tsx` - New component for managing presets
- `src/components/AlphaTabRenderer.tsx` - Expose track config getter/setter methods
- `src/services/supabaseStorageService.ts` - CRUD operations for presets
- `supabase/migrations/` - New migration for practice_presets table

## Acceptance Criteria

- [ ] Database table created with proper foreign keys and indexes
- [ ] Users can save current track configuration with custom name
- [ ] Preset selector dropdown appears when Guitar Pro file is loaded
- [ ] Selecting preset instantly applies track mute/solo configuration
- [ ] "Last Used" preset auto-saves when user changes tracks manually
- [ ] Users can rename existing presets
- [ ] Users can delete presets
- [ ] Preset names are unique per user+song combination
- [ ] Loading a new song loads the last used preset for that song
- [ ] Works correctly with multi-track Guitar Pro files
- [ ] Empty state when no presets exist
- [ ] Mobile-friendly preset selector

## Dependencies

- AlphaTab track mute/solo functionality working
- User authentication (for user_id scoping)
- PracticeControlBar component exists and integrates with AlphaTabRenderer
