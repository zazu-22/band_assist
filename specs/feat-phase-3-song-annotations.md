# Specification: Phase 3 - Song Annotations

| Field       | Value                    |
| ----------- | ------------------------ |
| **Status**  | Active                   |
| **Authors** | Claude & Jason           |
| **Created** | 2025-12-15               |
| **Updated** | 2025-12-15               |
| **Priority**| High                     |
| **Type**    | Feature                  |
| **Effort**  | Medium-Large (4-5 days)  |

---

## 1. Overview

Implement the third layer of the Song Collaboration Architecture: timestamped annotations that allow band members to add notes, cues, warnings, and questions tied to specific positions in songs. Annotations sync in real-time via Supabase and display as overlays on the AlphaTab renderer during playback.

## 2. Problem Statement

Band members currently have no way to:
- Add persistent notes or reminders tied to specific positions in songs
- Mark problem areas (tempo issues, missed entries) for follow-up practice
- Ask questions about arrangement decisions at specific musical moments
- See collaborative feedback overlaid on the sheet music during playback

This leads to:
- Practice notes lost in chat apps or forgotten
- No persistent record of "problem spots" in songs
- Rehearsal discussions disconnected from the actual music
- Difficulty communicating timing-sensitive feedback to other members

## 3. Goals

- Enable band members to create annotations at specific song positions (bar/beat level)
- Display annotations as visual overlays on the AlphaTab renderer
- Sync annotations in real-time across all band members
- Support annotation types: note (general), cue (performance reminder), warning (problem area), question (discussion point)
- Allow resolution/acknowledgment of question-type annotations
- Integrate with existing song sections from Phase 1

## 4. Non-Goals

- Threaded replies/discussions (future Phase 4 or separate feature)
- Audio/video annotations (text only for v1)
- Annotation templates or presets
- Export annotations to PDF or print
- Annotation permissions beyond band membership (all members can annotate any song)
- Offline annotation creation (requires connected state for real-time sync)

## 5. Requirements

### 5.1 Functional Requirements

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-1 | Create annotations via beat click | User shift+clicks a beat in AlphaTab, annotation editor opens with bar/beat position pre-filled |
| FR-2 | Display annotations on rendered score | Annotations display near their associated beat/bar when the bar is visible on screen (specific positioning is implementation detail) |
| FR-3 | Real-time sync via Supabase | When user A creates/edits/deletes an annotation, user B sees the change within 2 seconds without page refresh |
| FR-4 | Annotation types with visual distinction | Each type (note, cue, warning, question) has a distinct default color and icon; colors are: note=yellow, cue=blue, warning=red, question=green |
| FR-5 | Resolve/unresolve questions | Question-type annotations show a checkbox; checking it marks resolved and records resolver user ID |
| FR-6 | Link annotations to sections | Annotations can optionally reference a song section (from Phase 1); section name displays in annotation |
| FR-7 | Filter annotations by type | Annotation panel allows filtering by type (note/cue/warning/question) and resolved status |
| FR-8 | Edit and delete own annotations | Users can edit/delete annotations they authored; edit updates updated_at timestamp |
| FR-9 | Playback-synced display | During AlphaTab playback, annotations near the current playback position are highlighted |
| FR-10 | Annotation panel list view | Sidebar panel lists all annotations for a song, sorted by bar number |

### 5.2 Technical Requirements

- Database: New song_annotations table with RLS policies scoped to band membership
- Real-time: Supabase channel subscription for INSERT/UPDATE/DELETE events
- Position storage: Store bar_index and beat_index directly in database (not tick_position) for simple BoundsLookup API usage
- Type safety: TypeScript interface SongAnnotation with strict type unions
- Hook composition: Single useAnnotations hook that internally manages both CRUD operations and real-time subscriptions (following useSongSections pattern)

## 6. Implementation Approach

### Architecture

The annotation system follows the existing patterns established in Phase 1 (Song Sections) and Phase 2 (Section Assignments):

1. **Single Hook Pattern**: Create useAnnotations hook that combines:
   - Initial data fetch on mount
   - CRUD operations (create, update, delete)
   - Real-time subscription management (subscribe on mount, unsubscribe on unmount)
   - No separate useRealtimeAnnotations hook needed (matches existing useSongSections which handles its own state)

2. **Service Layer**: Add annotation CRUD methods to supabaseStorageService.ts:
   - `getAnnotations(songId): Promise<SongAnnotation[]>`
   - `createAnnotation(input): Promise<SongAnnotation>`
   - `updateAnnotation(id, updates): Promise<SongAnnotation>`
   - `deleteAnnotation(id): Promise<void>`
   - `subscribeToAnnotations(songId, bandId, callbacks): () => void` (returns unsubscribe function)

3. **Position Storage Strategy**: Store bar_index and beat_index directly in the database instead of tick_position. This simplifies the BoundsLookup API usage:
   ```typescript
   // When creating annotation from beatMouseDown event:
   const annotation = {
     barIndex: beat.voice.bar.index,
     beatIndex: beat.index,
     trackIndex: beat.voice.bar.staff.track.index,
   };

   // When rendering overlay:
   const beatBounds = boundsLookup.findBeat(trackIndex, barIndex, beatIndex);
   if (beatBounds) {
     // Position overlay using beatBounds.visualBounds
   }
   ```

4. **Type-to-Color Mapping**: Default colors are derived from annotation type (no color field in database):
   ```typescript
   const ANNOTATION_TYPE_COLORS = {
     note: 'yellow',
     cue: 'blue',
     warning: 'red',
     question: 'green',
   } as const;
   ```

5. **Overlay Rendering**: The AnnotationOverlay component renders annotation markers by:
   - Subscribing to AlphaTab's renderFinished event
   - Querying boundsLookup.findBeat() for each visible annotation
   - Positioning absolutely within the AlphaTab container using visual bounds
   - Using a portal or absolute positioned div layer above the rendered score

### Component Structure

```
src/components/annotations/
├── index.ts
├── AnnotationOverlay.tsx
├── AnnotationMarker.tsx
├── AnnotationEditor.tsx
├── AnnotationPanel.tsx
└── AnnotationBubble.tsx
```

### Real-time Subscription

```typescript
useEffect(() => {
  if (!songId || !bandId) return;

  const unsubscribe = supabaseStorageService.subscribeToAnnotations(
    songId,
    bandId,
    {
      onInsert: (annotation) => setAnnotations(prev => [...prev, annotation]),
      onUpdate: (annotation) => setAnnotations(prev =>
        prev.map(a => a.id === annotation.id ? annotation : a)
      ),
      onDelete: (id) => setAnnotations(prev => prev.filter(a => a.id !== id)),
    }
  );

  return () => unsubscribe();
}, [songId, bandId]);
```

## 7. Edge Cases and Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Annotation on deleted bar (GP file changed) | Display annotation in panel with "Position unavailable" warning |
| User creates annotation while offline | Show error toast "Annotations require internet connection" |
| Concurrent edit by two users | Last write wins; optimistic UI update, then reconcile on real-time event |
| Annotation author leaves band | Keep annotation; author_name shows "Former member" if user lookup fails |
| Very long annotation content | Database constraint: max 2000 characters; UI shows character count |
| AlphaTab not loaded (no boundsLookup) | Hide overlay layer; show annotations only in panel list view |
| Bar out of viewport | Annotation markers not rendered until bar scrolls into view |
| Real-time subscription disconnects | Show subtle "Reconnecting..." indicator; auto-reconnect per Supabase defaults |

## 8. Testing Strategy

### Unit Tests

- useAnnotations hook: Test CRUD operations, state updates, subscription cleanup
- AnnotationMarker component: Test type-to-color mapping, icon rendering
- AnnotationEditor component: Test validation (content required, character limit)
- Position conversion utilities: Test bar/beat index handling

### Integration Tests

- Create annotation flow: Click beat -> editor opens -> save -> appears in overlay and panel
- Real-time sync: Create in browser A -> appears in browser B within 2 seconds
- Delete flow: Delete annotation -> removed from overlay and panel
- Filter functionality: Apply type filter -> panel shows only matching annotations

### Manual Validation

- Test on mobile browsers (iOS Safari, Chrome Android)
- Test with large GP files (50+ bars)
- Test real-time sync with 3+ concurrent users
- Test reconnection after network interruption

## 9. Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/027_add_song_annotations.sql` | Create | Database table, indexes, RLS policies, updated_at trigger |
| `src/types.ts` | Modify | Add SongAnnotation, SongAnnotationInput, AnnotationType types |
| `src/types/database.types.ts` | Modify | Regenerate from Supabase schema |
| `src/services/supabaseStorageService.ts` | Modify | Add annotation CRUD and subscription methods |
| `src/hooks/useAnnotations.ts` | Create | Hook for annotation state, CRUD, and real-time sync |
| `src/components/annotations/index.ts` | Create | Barrel exports |
| `src/components/annotations/AnnotationOverlay.tsx` | Create | Overlay layer for AlphaTab renderer |
| `src/components/annotations/AnnotationMarker.tsx` | Create | Single annotation marker component |
| `src/components/annotations/AnnotationEditor.tsx` | Create | Create/edit annotation modal |
| `src/components/annotations/AnnotationPanel.tsx` | Create | Sidebar panel with annotation list |
| `src/components/annotations/AnnotationBubble.tsx` | Create | Expanded annotation detail view |
| `src/components/AlphaTabRenderer.tsx` | Modify | Expose boundsLookup ref, integrate overlay component |
| `src/components/SongDetail.tsx` | Modify | Add AnnotationPanel to song detail view |

### Database Migration Schema

```sql
CREATE TABLE song_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),

  section_id UUID REFERENCES song_sections(id) ON DELETE SET NULL,
  bar_index INTEGER NOT NULL,
  beat_index INTEGER NOT NULL DEFAULT 0,
  track_index INTEGER NOT NULL DEFAULT 0,

  content TEXT NOT NULL CHECK (length(content) <= 2000),
  annotation_type TEXT NOT NULL DEFAULT 'note' CHECK (annotation_type IN ('note', 'cue', 'warning', 'question')),

  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,

  visible_during_playback BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_annotations_song ON song_annotations(song_id);
CREATE INDEX idx_annotations_band ON song_annotations(band_id);
CREATE INDEX idx_annotations_section ON song_annotations(section_id);
CREATE INDEX idx_annotations_bar ON song_annotations(song_id, bar_index);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_song_annotations_updated_at
    BEFORE UPDATE ON song_annotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE song_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view annotations for their bands"
  ON song_annotations FOR SELECT TO authenticated
  USING (band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert annotations for their bands"
  ON song_annotations FOR INSERT TO authenticated
  WITH CHECK (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
    AND author_id = auth.uid()
  );

CREATE POLICY "Users can update their own annotations"
  ON song_annotations FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete their own annotations"
  ON song_annotations FOR DELETE TO authenticated
  USING (author_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE song_annotations;
```

## 10. Open Questions

None - all requirements are clear.
