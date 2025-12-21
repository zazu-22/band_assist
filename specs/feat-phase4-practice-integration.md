# Specification: Phase 4 Practice Integration

| Field       | Value                    |
| ----------- | ------------------------ |
| **Status**  | Active                   |
| **Authors** | Claude & Jason           |
| **Created** | 2025-12-21               |
| **Updated** | 2025-12-21               |
| **Priority**| High                     |
| **Type**    | Feature                  |
| **Effort**  | Small-Medium (2-3 days)  |
| **Parent**  | feat-song-collaboration-architecture.md |
| **Phase**   | 4 of 5                   |

---

## 1. Overview

Phase 4 integrates song sections with the practice tracking system, enabling users to log practice sessions tied to specific sections of a song. This provides granular practice analytics, allowing users to identify which sections need more attention and track progress at a structural level rather than just song-level.

## 2. Problem Statement

Currently, practice sessions are logged at the song level with only free-text section names (comma-separated strings). This creates several issues:

1. **No validation**: Users can type any text for "sections practiced", leading to inconsistent data (e.g., "intro", "Intro", "INTRO", "Opening" for the same section)
2. **No linking**: Practice data cannot be correlated with actual song sections defined in Phase 1
3. **No section-level analytics**: Users cannot see "I've practiced the Solo 47 times but only the Intro 3 times"
4. **Missed navigation opportunities**: The Practice Room has section navigation but doesn't track which sections the user focused on

## 3. Goals

- Enable section-aware practice logging with validated section IDs instead of free-text
- Provide a section picker UI in the LogPracticeModal for selecting practiced sections
- Display section-based practice statistics (total time per section, session count per section)
- Add keyboard shortcuts in Practice Room for quick section navigation (1-9 keys, arrow keys)
- Show practice history filtered by section in PracticeHistory and SongDetail pages

## 4. Non-Goals

- Automatic practice tracking based on playback position (future enhancement)
- Practice "streaks" or gamification features
- Integration with metronome or tempo tracking per section
- Multi-section loop practice mode (select sections A and B to loop)
- Exporting practice data to external formats

## 5. Requirements

### 5.1 Functional Requirements

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-1 | Add `section_ids` column to `practice_sessions` table | Migration adds `section_ids UUID[]` column; existing `sections_practiced TEXT[]` column remains for backwards compatibility; column accepts null or array of valid section UUIDs |
| FR-2 | SectionPicker component shows song sections as selectable chips | When song is selected in LogPracticeModal, available sections load from `useSongSections`; user can toggle individual sections on/off; selected sections shown with primary color highlight; empty state shows "No sections defined" message |
| FR-3 | LogPracticeModal integrates SectionPicker | SectionPicker appears below song selector when song has sections; selected section IDs saved to `section_ids` array; backwards-compatible with `sections_practiced` text field for songs without sections; edit mode pre-selects previously logged sections |
| FR-4 | Practice statistics include section breakdown | `usePracticeStats` hook extended to return `bySection: Map<string, { totalMinutes: number; sessionCount: number }>` keyed by section ID; aggregation query joins practice_sessions.section_ids with song_sections |
| FR-5 | SectionStatsCard displays per-section practice time | New component renders section stats in SongDetail STRUCTURE tab; shows bar chart or pill list of sections with practice time; positioned below SectionList component |
| FR-6 | Keyboard shortcuts navigate to sections in Practice Room | Keys 1-9 jump to sections 1-9; ArrowLeft/ArrowRight move to prev/next section when SectionNav container is focused; shortcuts only active when SectionNav container has focus via tabIndex; shortcuts disabled when input fields are focused; AlphaTab keyboard conflicts prevented by capturing events at SectionNav level before bubbling |
| FR-7 | PracticeHistory filters by section | Add section filter dropdown in PracticeHistory filter bar; filter shows sections from all songs or current song when song filter active; sessions displayed show section badges |

### 5.2 Technical Requirements

- Database migration must be reversible (provide down migration)
- `section_ids` column uses PostgreSQL array type for efficient querying with `@>` operator
- Real-time sync not required for practice data (polling-based refresh acceptable)
- SectionPicker must be keyboard accessible (Enter/Space to toggle, Tab to navigate)
- Maintain backwards compatibility: existing sessions with `sections_practiced` text still display correctly

## 6. Implementation Approach

### 6.1 Database Migration

Add `section_ids` column to `practice_sessions` table:

```sql
-- Migration: Add section_ids to practice_sessions
ALTER TABLE practice_sessions
ADD COLUMN section_ids UUID[] DEFAULT NULL;

-- Index for efficient array queries
CREATE INDEX idx_practice_sessions_section_ids
ON practice_sessions USING GIN (section_ids);

-- Comment for documentation
COMMENT ON COLUMN practice_sessions.section_ids IS
  'Array of song_sections.id UUIDs practiced in this session. Replaces free-text sections_practiced field.';
```

### 6.2 Type Updates

Extend `PracticeSession` interface in `src/types.ts`:

```typescript
export interface PracticeSession {
  id: string;
  userId: string;
  songId: string;
  bandId: string;
  durationMinutes: number;
  tempoBpm?: number;
  sectionsPracticed?: string[];  // Legacy: free-text section names
  sectionIds?: string[];          // NEW: array of song_sections.id UUIDs
  notes?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}
```

### 6.3 Service Layer Updates

Modify `supabaseStorageService.logPracticeSession()`:

```typescript
async logPracticeSession(
  session: Omit<PracticeSession, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PracticeSession> {
  // ... existing validation ...

  const { data, error } = await supabase
    .from('practice_sessions')
    .insert({
      user_id: session.userId,
      song_id: session.songId,
      band_id: session.bandId,
      duration_minutes: session.durationMinutes,
      tempo_bpm: session.tempoBpm ?? null,
      sections_practiced: session.sectionsPracticed ?? null, // Legacy
      section_ids: session.sectionIds ?? null,                // NEW
      notes: session.notes ?? null,
      date: session.date,
    })
    .select()
    .single();
  // ... rest of method ...
}
```

### 6.4 SectionPicker Component

Create `src/components/ui/SectionPicker.tsx`:

```typescript
export interface SectionPickerProps {
  /** Song ID to load sections for */
  songId: string | null;
  /** Band ID for section loading */
  bandId: string | null;
  /** Currently selected section IDs */
  selectedSectionIds: string[];
  /** Called when selection changes */
  onSelectionChange: (sectionIds: string[]) => void;
  /** Optional className */
  className?: string;
}

export const SectionPicker: React.FC<SectionPickerProps> = memo(function SectionPicker({
  songId,
  bandId,
  selectedSectionIds,
  onSelectionChange,
  className,
}) {
  const { sections, isLoading } = useSongSections(songId, bandId);

  const toggleSection = useCallback((sectionId: string) => {
    if (selectedSectionIds.includes(sectionId)) {
      onSelectionChange(selectedSectionIds.filter(id => id !== sectionId));
    } else {
      onSelectionChange([...selectedSectionIds, sectionId]);
    }
  }, [selectedSectionIds, onSelectionChange]);

  // Render: loading spinner, empty state, or section chips
});
```

**Props Interface:**
- `songId`: Required to fetch sections via `useSongSections` hook
- `bandId`: Required for band context in section queries
- `selectedSectionIds`: Controlled array of selected UUIDs
- `onSelectionChange`: Callback receives updated selection array

**Integration with useSongSections:**
- Uses existing `src/hooks/useSongSections.ts` hook
- Returns `{ sections, isLoading, error }` for the specified song
- Sections sorted by `displayOrder` for consistent chip ordering

**State Flow:**
1. Parent (LogPracticeModal) owns `selectedSectionIds` state
2. SectionPicker renders chips from `useSongSections` data
3. Chip click calls `toggleSection` which updates parent state via `onSelectionChange`
4. Parent includes `selectedSectionIds` in form submission

### 6.5 LogPracticeModal Integration

Modify `src/components/ui/LogPracticeModal.tsx`:

**State Changes:**
```typescript
interface FormState {
  // ... existing fields ...
  sectionIds: string[];  // NEW: array of selected section UUIDs
}
```

**Initialization Logic:**
```typescript
function computeInitialFormState(
  editSession: PracticeSession | undefined,
  // ...
): FormState {
  if (editSession) {
    return {
      // ... existing fields ...
      sectionIds: editSession.sectionIds ?? [],  // Pre-populate from session
    };
  }
  return {
    // ... existing fields ...
    sectionIds: [],  // Empty for new sessions
  };
}
```

**Render Integration:**
Insert SectionPicker after song selector, conditionally rendered when song is selected:
```tsx
{/* Song selection */}
<div className="space-y-2">
  <Label htmlFor="song-select">Song *</Label>
  <Select value={songId} onValueChange={handleSongChange}>
    {/* ... */}
  </Select>
</div>

{/* Section picker - NEW */}
{songId && (
  <div className="space-y-2">
    <Label>Sections Practiced</Label>
    <SectionPicker
      songId={songId}
      bandId={currentBandId}
      selectedSectionIds={formState.sectionIds}
      onSelectionChange={(ids) => setFormState(prev => ({ ...prev, sectionIds: ids }))}
    />
  </div>
)}
```

**Submission Changes:**
Include `sectionIds` in the `PracticeFormData` passed to `onSubmit`:
```typescript
await onSubmit({
  songId,
  durationMinutes: duration,
  tempoBpm: tempo,
  sectionIds: formState.sectionIds.length > 0 ? formState.sectionIds : undefined,  // NEW
  sectionsPracticed: sectionsPracticed.length > 0 ? sectionsPracticed : undefined, // Legacy
  notes: notes.trim() || undefined,
  date,
});
```

### 6.6 SectionStatsCard Component

Create `src/components/structure/SectionStatsCard.tsx`:

```typescript
export interface SectionStats {
  sectionId: string;
  sectionName: string;
  totalMinutes: number;
  sessionCount: number;
}

export interface SectionStatsCardProps {
  /** Song ID to show stats for */
  songId: string;
  /** Band ID for queries */
  bandId: string;
  /** User ID for filtering */
  userId: string;
  /** Sections with names for display */
  sections: SongSection[];
  /** Optional className */
  className?: string;
}

export const SectionStatsCard: React.FC<SectionStatsCardProps> = memo(function SectionStatsCard({
  songId,
  bandId,
  userId,
  sections,
  className,
}) {
  // Fetch section-level practice stats via extended usePracticeStats hook
  const { sectionStats, isLoading } = usePracticeStats(userId, bandId, { songId });

  // Map section IDs to names for display
  const statsWithNames = useMemo(() => {
    return sections.map(section => ({
      sectionId: section.id,
      sectionName: section.name,
      totalMinutes: sectionStats.get(section.id)?.totalMinutes ?? 0,
      sessionCount: sectionStats.get(section.id)?.sessionCount ?? 0,
    }));
  }, [sections, sectionStats]);

  // Render: horizontal bar chart or pill list showing practice time per section
});
```

**Integration Points:**
- Placed in SongDetail STRUCTURE tab below SectionList
- Uses extended `usePracticeStats` hook with new `sectionStats` return value
- Receives `sections` prop from parent's `useSongSections` call

### 6.7 usePracticeStats Hook Extension

Modify `src/hooks/usePracticeStats.ts`:

```typescript
export interface PracticeStats {
  totalSessions: number;
  totalMinutes: number;
  averageSessionMinutes: number;
  songsLearned: number;
  songsMastered: number;
  recentSessions: PracticeSession[];
  sectionStats: Map<string, { totalMinutes: number; sessionCount: number }>;  // NEW
}

// Query for section stats:
const sectionQuery = await supabase
  .from('practice_sessions')
  .select('duration_minutes, section_ids')
  .eq('user_id', userId)
  .eq('band_id', bandId)
  .not('section_ids', 'is', null);

// Aggregate results into Map
const sectionStats = new Map<string, { totalMinutes: number; sessionCount: number }>();
for (const session of sectionQuery.data ?? []) {
  const sectionIds = session.section_ids as string[] | null;
  if (!sectionIds) continue;

  const perSectionMinutes = session.duration_minutes / sectionIds.length;
  for (const sectionId of sectionIds) {
    const existing = sectionStats.get(sectionId) ?? { totalMinutes: 0, sessionCount: 0 };
    sectionStats.set(sectionId, {
      totalMinutes: existing.totalMinutes + perSectionMinutes,
      sessionCount: existing.sessionCount + 1,
    });
  }
}
```

### 6.8 Keyboard Navigation in Practice Room

Modify `src/components/practice/SectionNav.tsx`:

```typescript
export interface SectionNavProps {
  sections: SongSection[];
  currentBar?: number;
  totalBars: number;
  onSectionClick: (section: SongSection) => void;
  className?: string;
}

export const SectionNav: React.FC<SectionNavProps> = memo(function SectionNav({
  sections,
  currentBar,
  totalBars,
  onSectionClick,
  className,
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Find current section index for arrow key navigation
  const currentSectionIndex = useMemo(() => {
    if (!currentBar) return -1;
    return sections.findIndex(s => currentBar >= s.startBar && currentBar <= s.endBar);
  }, [currentBar, sections]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Check if an input field has focus - if so, ignore shortcuts
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement) {
      return;
    }

    // Number keys 1-9 jump to sections
    if (e.key >= '1' && e.key <= '9') {
      const index = parseInt(e.key, 10) - 1;
      if (index < sections.length) {
        e.preventDefault();
        e.stopPropagation();  // Prevent AlphaTab from capturing
        onSectionClick(sections[index]);
      }
    }

    // Arrow keys navigate relative to current section
    if (e.key === 'ArrowLeft' && currentSectionIndex > 0) {
      e.preventDefault();
      e.stopPropagation();
      onSectionClick(sections[currentSectionIndex - 1]);
    }
    if (e.key === 'ArrowRight' && currentSectionIndex < sections.length - 1) {
      e.preventDefault();
      e.stopPropagation();
      onSectionClick(sections[currentSectionIndex + 1]);
    }
  }, [sections, currentSectionIndex, onSectionClick]);

  return (
    <div
      ref={containerRef}
      className={cn('border-b border-border bg-card/50', className)}
      tabIndex={0}  // Make focusable for keyboard events
      onKeyDown={handleKeyDown}
      role="navigation"
      aria-label="Section navigation. Press 1-9 to jump to sections, arrow keys to navigate."
    >
      {/* ... existing content ... */}
    </div>
  );
});
```

**Focus Handling:**
- Container has `tabIndex={0}` to receive keyboard focus
- Keyboard shortcuts only fire when SectionNav container has focus
- User clicks inside Practice Room to focus SectionNav, then uses keyboard
- Input fields (tempo, BPM) are excluded via `activeElement` check

**AlphaTab Conflict Prevention:**
- `e.stopPropagation()` prevents events from bubbling to AlphaTab
- AlphaTab only captures events that reach its container
- SectionNav positioned above AlphaTab in DOM, receives events first

### 6.9 PracticeHistory Section Filter

Modify `src/components/PracticeHistory.tsx`:

**Filter State:**
```typescript
interface FilterState {
  // ... existing filters ...
  sectionId: string | null;  // NEW: filter by section
}
```

**Filter UI:**
```tsx
{/* Section filter - only shown when song filter is active */}
{filters.songId && (
  <div className="space-y-1">
    <Label htmlFor="section-filter" className="text-xs">Section</Label>
    <Select
      value={filters.sectionId ?? 'all'}
      onValueChange={(v) => setFilters(prev => ({
        ...prev,
        sectionId: v === 'all' ? null : v
      }))}
    >
      <SelectTrigger id="section-filter" className="h-9">
        <SelectValue placeholder="All sections" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All sections</SelectItem>
        {songSections.map(section => (
          <SelectItem key={section.id} value={section.id}>
            {section.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

**Session Filtering:**
```typescript
// Filter sessions by section (client-side, since section_ids is an array)
const filteredSessions = useMemo(() => {
  if (!filters.sectionId) return sessions;
  return sessions.filter(session =>
    session.sectionIds?.includes(filters.sectionId!)
  );
}, [sessions, filters.sectionId]);
```

## 7. Edge Cases and Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Song has no sections defined | SectionPicker shows "No sections defined for this song" message; legacy `sections_practiced` text field remains functional as fallback |
| User edits session with deleted sections | Section IDs that no longer exist in song_sections are silently filtered out on edit; save only includes valid section IDs |
| Section deleted after practice logged | Practice history shows "Unknown section" badge with muted styling; section stats exclude deleted sections |
| Practice session logged for multiple sections | Duration distributed equally across sections for stats (e.g., 30 min session with 3 sections = 10 min per section) |
| Network error loading sections | SectionPicker shows error state with retry button; form still submittable without section selection |
| User focuses AlphaTab while in Practice Room | Keyboard shortcuts in SectionNav only work when SectionNav container has focus; AlphaTab retains its own keyboard handling (space for play/pause) |
| Keyboard shortcut pressed with input focused | Shortcuts are ignored when HTMLInputElement, HTMLTextAreaElement, or HTMLSelectElement has focus |
| Section key 1-9 pressed but section doesn't exist | Key press ignored; no error or feedback needed |
| Very long section list (10+ sections) | Only keys 1-9 work for direct jump; arrow keys navigate through all sections; consider future enhancement for section search |

## 8. Testing Strategy

### 8.1 Unit Tests

**SectionPicker Component** (`src/components/ui/__tests__/SectionPicker.test.tsx`):

| Test Case | Description |
|-----------|-------------|
| `renders loading state` | Shows spinner while sections load |
| `renders empty state when song has no sections` | Displays "No sections defined" message |
| `renders section chips for available sections` | Each section from useSongSections displayed as chip |
| `toggles section selection on click` | Click unselected chip adds to selection; click selected chip removes |
| `calls onSelectionChange with updated array` | Verify callback receives correct array after toggle |
| `pre-selects sections from selectedSectionIds prop` | Initial selection highlighted correctly |
| `keyboard navigation works` | Tab moves between chips; Enter/Space toggles selection |
| `handles null songId gracefully` | Shows empty state, no error thrown |

**SectionNav Keyboard Shortcuts** (`src/components/practice/SectionNav.test.tsx`):

| Test Case | Description |
|-----------|-------------|
| `key 1 navigates to first section` | Press "1" calls onSectionClick with sections[0] |
| `key 5 navigates to fifth section` | Press "5" calls onSectionClick with sections[4] |
| `key 9 ignored if fewer than 9 sections` | Press "9" with 3 sections does not call onSectionClick |
| `ArrowRight moves to next section` | From section 2, ArrowRight navigates to section 3 |
| `ArrowLeft moves to previous section` | From section 3, ArrowLeft navigates to section 2 |
| `ArrowLeft at first section does nothing` | From section 1, ArrowLeft does not call onSectionClick |
| `ArrowRight at last section does nothing` | From last section, ArrowRight does not call onSectionClick |
| `shortcuts ignored when input focused` | Focus input, press "1", verify onSectionClick not called |
| `stopPropagation prevents AlphaTab capture` | Verify event.stopPropagation called on handled keys |

**usePracticeStats Section Aggregation** (`src/hooks/__tests__/usePracticeStats.test.ts`):

| Test Case | Description |
|-----------|-------------|
| `returns empty sectionStats when no sessions` | sectionStats Map is empty |
| `aggregates single section correctly` | Session with one section_id adds full duration |
| `distributes duration across multiple sections` | 60 min with 3 sections = 20 min each |
| `counts sessions per section` | Each session increments sessionCount for its sections |
| `excludes sessions with null section_ids` | Legacy sessions don't affect sectionStats |
| `filters by songId when provided` | Only sessions for specified song included |

### 8.2 Integration Tests

**LogPracticeModal with SectionPicker** (`src/components/ui/__tests__/LogPracticeModal.integration.test.tsx`):

| Test Case | Description |
|-----------|-------------|
| `section_ids saved to practice session` | Submit form with sections selected; verify logPracticeSession called with correct sectionIds array |
| `edit mode pre-populates sections` | Open modal with editSession containing sectionIds; verify chips pre-selected |
| `song change clears section selection` | Select song A with sections, change to song B, verify selection cleared |
| `form submits without sections for songs without sections` | Song with no sections; verify form submits successfully with undefined sectionIds |

**Practice Room Keyboard Navigation** (`src/components/__tests__/PracticeRoom.keyboard.test.tsx`):

| Test Case | Description |
|-----------|-------------|
| `clicking SectionNav then pressing 1 seeks to first section` | Focus SectionNav, press "1", verify AlphaTab seekTo called |
| `arrow keys navigate through sections` | Focus SectionNav, press ArrowRight repeatedly, verify sequential section navigation |
| `shortcuts work after section button click` | Click section button (focuses container), press "2", verify navigation |

### 8.3 Manual Validation Checklist

- [ ] Log practice session with 2+ sections selected, verify saved correctly
- [ ] Edit practice session, add/remove sections, verify persisted
- [ ] View PracticeHistory with section filter, verify filtering works
- [ ] View SongDetail STRUCTURE tab, verify section stats display
- [ ] In Practice Room, click section nav area, press 1-9 keys, verify navigation
- [ ] In Practice Room, use arrow keys to navigate sections
- [ ] Verify keyboard shortcuts don't fire when tempo input is focused
- [ ] Verify AlphaTab play/pause (space) still works when AlphaTab is focused
- [ ] Test with song that has no sections defined, verify graceful fallback
- [ ] Test legacy session (sections_practiced text), verify still displays correctly

## 9. Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/XXX_add_section_ids_to_practice_sessions.sql` | Create | Add `section_ids UUID[]` column, GIN index, and down migration |
| `src/types.ts` | Modify | Add `sectionIds?: string[]` to `PracticeSession` interface |
| `src/types/database.types.ts` | Modify | Regenerate types to include `section_ids` column |
| `src/services/supabaseStorageService.ts` | Modify | Update `logPracticeSession`, `updatePracticeSession`, and `getPracticeSessions` to handle `section_ids` |
| `src/components/ui/SectionPicker.tsx` | Create | Chip-based section selection component with keyboard accessibility |
| `src/components/ui/__tests__/SectionPicker.test.tsx` | Create | Unit tests for SectionPicker component |
| `src/components/ui/LogPracticeModal.tsx` | Modify | Integrate SectionPicker, add sectionIds to form state and submission |
| `src/components/ui/index.ts` | Modify | Export SectionPicker component |
| `src/components/structure/SectionStatsCard.tsx` | Create | Display per-section practice statistics |
| `src/components/structure/index.ts` | Modify | Export SectionStatsCard component |
| `src/hooks/usePracticeStats.ts` | Modify | Add `sectionStats` Map to return value, implement section aggregation query |
| `src/components/practice/SectionNav.tsx` | Modify | Add keyboard event handler for 1-9 and arrow key shortcuts, tabIndex for focus |
| `src/components/practice/SectionNav.test.tsx` | Create | Unit tests for keyboard navigation |
| `src/components/PracticeHistory.tsx` | Modify | Add section filter dropdown, display section badges on sessions |

## 10. Open Questions

None - all requirements are clear.

---

## Related Documents

- Architecture: `specs/backlog/feat-song-collaboration-architecture.md`
- Phase 1 Spec: `specs/feat-phase1-song-sections.md`
- Phase 2 Spec: `specs/feat-phase2-section-assignments.md`
- Phase 3 Spec: `specs/feat-phase-3-song-annotations.md`
