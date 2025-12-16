# Specification: Phase 4 Practice Integration

| Field       | Value                    |
| ----------- | ------------------------ |
| **Status**  | Active                   |
| **Authors** | Claude & Jason           |
| **Created** | 2025-12-16               |
| **Updated** | 2025-12-16               |
| **Priority**| High                     |
| **Type**    | Feature                  |
| **Effort**  | Small-Medium (2-3 days)  |
| **Parent**  | feat-song-collaboration-architecture.md |

---

## 1. Overview

Integrate song sections, section assignments, and annotations into the practice experience. This phase connects the structural information from Phases 1-3 with the existing practice tracking system, enabling users to log practice sessions by specific sections and view section-based practice analytics.

## 2. Problem Statement

Currently, practice logging has limited integration with song structure:

1. **Sections as free text**: The `LogPracticeModal` accepts sections as a comma-separated text input, which doesn't leverage the structured `song_sections` data from Phase 1. This leads to inconsistent naming and inability to track practice by specific section IDs.

2. **No section-specific stats**: Practice history shows which section names were practiced but cannot aggregate stats per section (e.g., "You've practiced the Solo section 15 times this month").

3. **Limited Practice Room integration**: While `SectionNav` shows navigation pills, there's no:
   - Keyboard shortcuts for quick section navigation
   - "Your Assignment" display showing what the current user should play in the active section
   - Quick logging of practice for the current section

4. **Missing annotation context**: Annotations created in Phase 3 aren't surfaced in practice mode, so users miss important notes while practicing.

## 3. Goals

- Enable section-aware practice logging that references actual `song_sections` records
- Provide section picker UI in `LogPracticeModal` when sections exist for a song
- Add section-based practice statistics (practice count, total time per section)
- Implement keyboard shortcuts for section navigation in Practice Room
- Display "Your Assignment" panel in Practice Room when user has section assignments
- Surface relevant annotations in Practice Room during playback position

## 4. Non-Goals

- Automatic practice detection (tracking starts manually via modal)
- Timer-based practice tracking (duration is entered after the fact)
- Band-wide practice analytics (remains per-user only)
- Section loop range setting from section click (seekTo is sufficient for this phase)
- Annotation editing in Practice Room (view-only for this phase)

## 5. Requirements

### 5.1 Functional Requirements

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-1 | Section picker in LogPracticeModal | When logging practice for a song with sections, show a multi-select section picker instead of text input |
| FR-2 | Section IDs stored in practice sessions | Practice sessions store `section_ids` array (UUIDs) in addition to `sections_practiced` (names) for backward compatibility |
| FR-3 | Practice stats by section | New component displays practice count and total minutes per section for a song |
| FR-4 | Section navigation keyboard shortcuts | Numbers 1-9 navigate to sections 1-9; left/right arrows move to prev/next section |
| FR-5 | Your Assignment display | Show current user's assignment for the active section in Practice Room header |
| FR-6 | Annotation overlay in Practice Room | Display annotations near their bar position during playback (read-only) |
| FR-7 | Section filter in Practice History | Filter practice sessions by specific section(s) practiced |

### 5.2 Technical Requirements

- Extend `practice_sessions.sections_practiced` JSONB to support both array of names (legacy) and array of section IDs
- Add new database column `practice_sessions.section_ids UUID[]` for structured section references
- Create index on `practice_sessions.section_ids` using GIN for efficient filtering
- Maintain backward compatibility: display section names even when IDs are stored
- Keyboard shortcuts only active when Practice Room has focus (not during text input)

## 6. Implementation Approach

### 6.1 Database Changes

Add a new column to `practice_sessions` table:

```sql
ALTER TABLE practice_sessions
ADD COLUMN section_ids UUID[] DEFAULT NULL;

CREATE INDEX idx_practice_sessions_section_ids
ON practice_sessions USING GIN (section_ids);

COMMENT ON COLUMN practice_sessions.section_ids IS
'Array of song_section UUIDs practiced. NULL for legacy sessions. sections_practiced text array kept for display.';
```

### 6.2 Component Architecture

```
src/components/
├── practice/
│   ├── SectionPicker.tsx        # Multi-select for sections in LogPracticeModal
│   ├── SectionPracticeStats.tsx # Per-section practice statistics
│   ├── YourAssignmentBar.tsx    # Shows user's assignment in PracticeRoom
│   └── AnnotationOverlay.tsx    # Read-only annotation display during practice
├── ui/
│   └── LogPracticeModal.tsx     # Modified to use SectionPicker
└── PracticeRoom.tsx             # Add keyboard shortcuts, assignment bar, annotations
```

### 6.3 Key Integration Points

1. **LogPracticeModal Enhancement**
   - Fetch sections via `useSongSections` when song is selected
   - Replace text input with `SectionPicker` when sections exist
   - Store both section IDs and names on submit

2. **Practice Room Enhancements**
   - Add `useHotkeys` for section navigation (1-9, arrows)
   - Import `YourAssignment` from structure components and display when relevant
   - Subscribe to annotations and display near current position

3. **Practice History Enhancement**
   - Add section filter dropdown (populated from all sections of filtered song)
   - Filter by `section_ids` contains when filtering

## 7. Edge Cases and Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Song has no sections defined | Show existing text input for sections (backward compatible) |
| Section deleted after practice logged | Display stored section name; section_id reference becomes orphan but doesn't break UI |
| User not linked to any band member | Hide "Your Assignment" panel; practice logging still works |
| Practice session from before Phase 4 | Display `sections_practiced` text array; `section_ids` is null |
| Keyboard shortcut during text input | Do not trigger section navigation; allow normal typing |
| Section number > available sections | Ignore keypress (e.g., pressing "7" when only 5 sections exist) |
| Network error fetching sections | Fall back to text input with error toast |
| No annotations for current song | Annotation overlay is simply empty (no error state) |

## 8. Testing Strategy

### 8.1 Unit Tests

| Component/Function | Test Cases |
|-------------------|------------|
| `SectionPicker` | Selection toggle, select all, clear all, keyboard navigation |
| `useSectionPracticeStats` | Aggregation logic, empty state, date range filtering |
| `calculateSectionFromPosition` | Bar-to-section mapping, edge cases at section boundaries |
| Keyboard shortcut handlers | Number keys 1-9, arrow keys, disabled during input focus |

### 8.2 Integration Tests

| Scenario | Verification |
|----------|--------------|
| Log practice with sections | Section IDs and names saved correctly to database |
| View practice history | Sessions with/without section IDs display correctly |
| Filter by section | Query returns correct filtered results |
| Practice Room navigation | Section clicks and keyboard shortcuts seek to correct position |

### 8.3 Manual Validation

- [ ] Open Practice Room for song with sections, verify SectionNav displays
- [ ] Press number keys 1-9 to navigate sections, verify playback position changes
- [ ] Open Log Practice modal, verify section picker shows for songs with sections
- [ ] Log practice session with sections selected
- [ ] View Practice History, verify sections display and filter works
- [ ] Check Your Assignment displays when user has assignment for current section
- [ ] Verify annotations appear near their bar position during playback

## 9. Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/XXX_add_section_ids_to_practice.sql` | Create | Add section_ids column and index |
| `src/types.ts` | Modify | Add `sectionIds?: string[]` to PracticeSession type |
| `src/components/practice/SectionPicker.tsx` | Create | Multi-select component for section selection |
| `src/components/practice/SectionPracticeStats.tsx` | Create | Stats display showing practice time per section |
| `src/components/practice/YourAssignmentBar.tsx` | Create | Compact assignment display for Practice Room |
| `src/components/practice/AnnotationOverlay.tsx` | Create | Read-only annotation display during practice |
| `src/components/practice/index.ts` | Modify | Export new components |
| `src/components/ui/LogPracticeModal.tsx` | Modify | Integrate SectionPicker when sections available |
| `src/components/PracticeRoom.tsx` | Modify | Add keyboard shortcuts, assignment bar, annotation overlay |
| `src/components/PracticeHistory.tsx` | Modify | Add section filter dropdown |
| `src/hooks/usePracticeSessions.ts` | Modify | Support sectionIds in input/output |
| `src/hooks/useSectionPracticeStats.ts` | Create | Hook for fetching per-section practice stats |
| `src/services/supabaseStorageService.ts` | Modify | Update practice session methods for section_ids |
| `src/types/database.types.ts` | Regenerate | Include new column in generated types |

## 10. Open Questions

None - all requirements are clear based on existing Phases 1-3 implementation patterns.

---

## Appendix: Data Model Reference

### Updated PracticeSession Type

```typescript
export interface PracticeSession {
  id: string;
  userId: string;
  songId: string;
  bandId: string;
  durationMinutes: number;
  tempoBpm?: number;
  sectionsPracticed?: string[];  // Legacy: array of section names
  sectionIds?: string[];         // New: array of song_section UUIDs
  notes?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}
```

### SectionPicker Props

```typescript
interface SectionPickerProps {
  sections: SongSection[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}
```

### Section Practice Stats Shape

```typescript
interface SectionPracticeStat {
  sectionId: string;
  sectionName: string;
  sessionCount: number;
  totalMinutes: number;
  lastPracticedAt: string | null;
}
```

---

## Related Documents

- `specs/backlog/feat-song-collaboration-architecture.md` - Parent architecture spec
- `supabase/migrations/020_add_practice_tracking.sql` - Existing practice schema
- Phase 1 PR: Song Sections (#231)
- Phase 2 PR: Section Assignments (#233)
- Phase 3 PR: Annotations (#236)
