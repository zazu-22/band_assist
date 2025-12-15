# Specification: Phase 1 - Song Sections Feature

| Field       | Value                    |
| ----------- | ------------------------ |
| **Status**  | Active                   |
| **Authors** | Claude & Jason           |
| **Created** | 2025-12-15               |
| **Updated** | 2025-12-15               |
| **Priority**| High                     |
| **Type**    | Feature                  |
| **Effort**  | Medium (3-4 days)        |
| **Epic**    | Song Collaboration Architecture |
| **GitHub**  | Issue #196               |

---

## 1. Overview

This spec implements Phase 1 of the Song Collaboration epic: the Song Sections feature. It creates a `song_sections` database table, extracts sections from Guitar Pro file markers, adds a STRUCTURE tab to the SongDetail page, and provides section-based navigation in the Practice Room. This foundational feature enables future phases (section assignments, annotations) by establishing the structural breakdown of songs.

## 2. Problem Statement

Band members have no way to define or visualize song structure within the application. Currently:
- Song structure exists only in musicians' heads or scattered notes
- Guitar Pro files contain section markers, but they are not exposed in the UI
- Practice sessions cannot target specific sections (intro, verse, chorus, solo)
- No shared understanding of "where are we in the song" during rehearsals

Without song sections:
- Practice is unfocused - members cannot isolate problem areas
- Arrangement discussions lack a common reference ("the part after the second chorus")
- The Practice Room cannot jump to specific sections for targeted practice

## 3. Goals

- Store song sections with bar ranges and tick positions in a dedicated database table
- Automatically extract sections from Guitar Pro file markers when available
- Display sections in a new STRUCTURE tab within SongDetail
- Enable manual section creation, editing, and deletion
- Provide section-based navigation in Practice Room (click section to jump)
- Establish foundation for Phase 2 (assignments) and Phase 3 (annotations)

## 4. Non-Goals

- Section assignments (Phase 2 scope)
- Annotations/notes on sections (Phase 3 scope)
- AlphaTex editing or export
- Lead sheet generation from sections
- Real-time collaborative editing of sections
- Migration of existing `songs.parts` data (kept separate; parts are content, sections are structure)

## 5. Requirements

### 5.1 Functional Requirements

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-1 | Create `song_sections` table in Supabase | Migration creates table with all specified columns, RLS policies, and indexes. Verified via `\d song_sections` showing correct schema. |
| FR-2 | Extract sections from GP file markers | When a GP chart is loaded, sections are extracted from `masterBars.section` and saved to `song_sections`. Verified by uploading a GP file with markers and checking sections appear. |
| FR-3 | Add STRUCTURE tab to SongDetail | Tab appears between CHARTS and ASSIGNMENTS. Tab type union updated to `'OVERVIEW' \| 'CHARTS' \| 'STRUCTURE' \| 'ASSIGNMENTS' \| 'AUDIO'`. Tab is keyboard navigable. |
| FR-4 | Display section list in STRUCTURE tab | Sections shown as cards with: name, bar range (e.g., "bars 1-8"), source indicator (GP marker vs manual). |
| FR-5 | Create section manually | "Add Section" button opens form. User enters name, start bar, end bar. Section saved via `supabaseStorageService.createSection()`. |
| FR-6 | Edit existing section | Each section card has edit button. Opens pre-filled form. Updates via `supabaseStorageService.updateSection()`. |
| FR-7 | Delete section | Each section card has delete button with confirmation dialog. Deletes via `supabaseStorageService.deleteSection()`. |
| FR-8 | Display sections in Practice Room | Section pills/buttons shown above chart area. Current section highlighted based on playback position. |
| FR-9 | Navigate to section in Practice Room | Clicking a section button seeks AlphaTab to section start. Uses `alphaTabRef.current.seekTo(percentage)` where percentage is calculated as `(startBar - 1) / totalBars`. |
| FR-10 | Re-extract sections from GP | "Re-extract from GP" button in STRUCTURE tab. Prompts for confirmation (overwrites manual edits). |

### 5.2 Technical Requirements

- Database migration follows existing pattern in `/supabase/migrations/`
- Service methods added to `supabaseStorageService.ts` (not a new service file) - follows existing pattern per `usePracticeSessions.ts`
- TypeScript types added to `src/types.ts`
- New hook `useSongSections.ts` follows `usePracticeSessions.ts` pattern
- Components placed in `src/components/structure/` directory
- `barCount` computed client-side in mapping layer (not stored in database)

## 6. Implementation Approach

### 6.1 Database Schema

```sql
-- Migration: 025_add_song_sections.sql

CREATE TABLE song_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,              -- "Intro", "Verse 1", "Guitar Solo"
  display_order INTEGER NOT NULL,

  -- Position (bar-based, 1-indexed for human readability)
  start_bar INTEGER NOT NULL,
  end_bar INTEGER NOT NULL,

  -- Position (tick-based for precise playback sync)
  start_tick INTEGER,
  end_tick INTEGER,                -- NULL for final section; calculated at query time

  -- Metadata
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('gp_marker', 'manual')),
  color TEXT,                      -- Optional color for UI highlighting

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_bar_range CHECK (end_bar >= start_bar),
  UNIQUE(song_id, display_order)
);

-- Indexes
CREATE INDEX idx_song_sections_song_id ON song_sections(song_id);
CREATE INDEX idx_song_sections_band_id ON song_sections(band_id);
CREATE INDEX idx_song_sections_display_order ON song_sections(song_id, display_order);

-- RLS Policies (follow band membership pattern)
ALTER TABLE song_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sections for their bands"
  ON song_sections FOR SELECT TO authenticated
  USING (band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert sections for their bands"
  ON song_sections FOR INSERT TO authenticated
  WITH CHECK (band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid()));

CREATE POLICY "Users can update sections for their bands"
  ON song_sections FOR UPDATE TO authenticated
  USING (band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete sections for their bands"
  ON song_sections FOR DELETE TO authenticated
  USING (band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid()));
```

### 6.2 TypeScript Types

```typescript
// Added to src/types.ts

export type SectionSource = 'gp_marker' | 'manual';

export interface SongSection {
  id: string;
  songId: string;
  bandId: string;
  name: string;
  displayOrder: number;
  startBar: number;
  endBar: number;
  barCount: number;       // Computed client-side: endBar - startBar + 1
  startTick?: number;
  endTick?: number;       // May be null for final section
  source: SectionSource;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

// Input type for creating/updating (excludes computed fields)
export interface SongSectionInput {
  songId: string;
  bandId: string;
  name: string;
  displayOrder: number;
  startBar: number;
  endBar: number;
  startTick?: number;
  endTick?: number;
  source: SectionSource;
  color?: string;
}
```

**Note:** The `barCount` property is NOT stored in the database. It is computed client-side in the `transformSongSection()` method within `supabaseStorageService.ts`:

```typescript
private transformSongSection(row: Database['public']['Tables']['song_sections']['Row']): SongSection {
  return {
    id: row.id,
    songId: row.song_id,
    bandId: row.band_id,
    name: row.name,
    displayOrder: row.display_order,
    startBar: row.start_bar,
    endBar: row.end_bar,
    barCount: row.end_bar - row.start_bar + 1, // Computed here
    startTick: row.start_tick ?? undefined,
    endTick: row.end_tick ?? undefined,
    source: row.source as SectionSource,
    color: row.color ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

### 6.3 Service Layer (Added to supabaseStorageService.ts)

Following the established pattern in this codebase, section operations are added to `SupabaseStorageService` class rather than creating a new service file. This matches how `getPracticeSessions()`, `logPracticeSession()`, etc. are implemented.

```typescript
// Added to SupabaseStorageService class

/**
 * Get all sections for a song
 */
async getSongSections(songId: string): Promise<SongSection[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('song_sections')
    .select('*')
    .eq('song_id', songId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data || []).map(row => this.transformSongSection(row));
}

/**
 * Create a new section
 */
async createSection(input: SongSectionInput): Promise<SongSection> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('song_sections')
    .insert({
      song_id: input.songId,
      band_id: input.bandId,
      name: input.name,
      display_order: input.displayOrder,
      start_bar: input.startBar,
      end_bar: input.endBar,
      start_tick: input.startTick ?? null,
      end_tick: input.endTick ?? null,
      source: input.source,
      color: input.color ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return this.transformSongSection(data);
}

/**
 * Update an existing section
 */
async updateSection(sectionId: string, updates: Partial<SongSectionInput>): Promise<SongSection> {
  // Implementation follows same pattern
}

/**
 * Delete a section
 */
async deleteSection(sectionId: string): Promise<void> {
  // Implementation follows same pattern
}

/**
 * Bulk upsert sections (for GP extraction)
 */
async upsertSections(songId: string, bandId: string, sections: SongSectionInput[]): Promise<SongSection[]> {
  // Delete existing gp_marker sections, then insert new ones
}
```

### 6.4 SongDetail Tab Integration

The following specific changes are required in `SongDetail.tsx`:

1. **Update tab type union (line 74):**
```typescript
// Before:
const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CHARTS' | 'ASSIGNMENTS' | 'AUDIO'>('OVERVIEW');

// After:
const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CHARTS' | 'STRUCTURE' | 'ASSIGNMENTS' | 'AUDIO'>('OVERVIEW');
```

2. **Update tabs array (line 353):**
```typescript
// Before:
const tabs = ['OVERVIEW', 'CHARTS', 'ASSIGNMENTS', 'AUDIO'] as const;

// After:
const tabs = ['OVERVIEW', 'CHARTS', 'STRUCTURE', 'ASSIGNMENTS', 'AUDIO'] as const;
```

3. **Add STRUCTURE tabpanel (after CHARTS panel, around line 853):**
```tsx
{/* STRUCTURE TAB */}
{activeTab === 'STRUCTURE' && (
  <div
    id="tabpanel-structure"
    role="tabpanel"
    aria-labelledby="tab-structure"
    className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-1"
  >
    <StructureTab
      song={song}
      onSectionsChange={handleSectionsChange}
    />
  </div>
)}
```

### 6.5 Tick-to-Percentage Conversion for Section Navigation

The AlphaTab `seekTo()` method takes a percentage (0-1), not a tick value. Here is how to convert section position to a seek percentage:

```typescript
// In PracticeRoom.tsx - section navigation handler

const handleSectionClick = useCallback((section: SongSection) => {
  if (!alphaTabRef.current) return;

  // Use bar-based calculation for navigation:
  // percentage = (startBar - 1) / totalBars
  // This provides acceptable accuracy for most songs

  if (totalBars > 0) {
    const percentage = (section.startBar - 1) / totalBars;
    alphaTabRef.current.seekTo(Math.max(0, Math.min(1, percentage)));
  }
}, [totalBars]);

// Helper to get total bars (stored when score loads)
const [totalBars, setTotalBars] = useState(0);

// Set in onTracksLoaded or onReady callback:
// setTotalBars(api.score?.masterBars.length ?? 0);
```

**Note:** For section navigation, bar-based percentage calculation (`startBar / totalBars`) provides acceptable accuracy for most use cases. The tick-based approach is more precise for songs with tempo changes but requires additional infrastructure. Phase 1 will use bar-based navigation; tick-based precision can be added in a future iteration if needed.

### 6.6 Section Extraction from Guitar Pro

```typescript
// In src/lib/sectionExtractor.ts

import type { SongSectionInput } from '@/types';

interface AlphaTabMasterBar {
  section?: { text: string };
  start: number;           // Tick position where this bar starts
}

interface AlphaTabScore {
  masterBars: AlphaTabMasterBar[];
}

/**
 * Extract sections from a Guitar Pro score.
 *
 * EndTick handling:
 * - For all sections except the last: endTick = next section's startTick - 1
 * - For the final section: endTick = null (indicates "until end of song")
 *
 * The Practice Room handles null endTick by treating it as "play to end"
 * when setting loop ranges or calculating section duration.
 */
export function extractSectionsFromScore(
  score: AlphaTabScore,
  songId: string,
  bandId: string
): SongSectionInput[] {
  const sections: SongSectionInput[] = [];
  let currentSection: Partial<SongSectionInput> | null = null;

  score.masterBars.forEach((masterBar, index) => {
    const barNumber = index + 1; // 1-indexed for human readability

    if (masterBar.section?.text) {
      // Close previous section
      if (currentSection) {
        currentSection.endBar = barNumber - 1;
        // endTick for previous section = this bar's start tick - 1
        currentSection.endTick = masterBar.start - 1;
        sections.push(currentSection as SongSectionInput);
      }

      // Start new section
      currentSection = {
        songId,
        bandId,
        name: masterBar.section.text,
        displayOrder: sections.length,
        startBar: barNumber,
        startTick: masterBar.start,
        source: 'gp_marker',
      };
    }
  });

  // Close final section
  if (currentSection) {
    currentSection.endBar = score.masterBars.length;
    // Final section's endTick is null - means "to end of song"
    // This is intentional: the Practice Room handles null endTick
    // by using the song's total duration for loop end points
    currentSection.endTick = undefined; // Will be stored as NULL in DB
    sections.push(currentSection as SongSectionInput);
  }

  return sections;
}
```

**Handling null endTick in Practice Room:**

```typescript
// When setting loop range for a section:
const handleLoopSection = (section: SongSection) => {
  if (!alphaTabRef.current || !section.startTick) return;

  // For final section (endTick is null/undefined), use a large value
  // AlphaTab will clamp to actual song end
  const endTick = section.endTick ?? Number.MAX_SAFE_INTEGER;

  alphaTabRef.current.setLoopRange({
    startTick: section.startTick,
    endTick: endTick,
  });
  alphaTabRef.current.setLoop(true);
};
```

### 6.7 Component Structure

```
src/components/structure/
  index.ts              # Barrel export
  StructureTab.tsx      # Main container for STRUCTURE tab
  SectionList.tsx       # List of section cards
  SectionCard.tsx       # Single section display
  SectionForm.tsx       # Create/edit form dialog

src/hooks/
  useSongSections.ts    # Hook following usePracticeSessions pattern
```

## 7. Edge Cases and Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| GP file has no section markers | Show empty state: "No sections found. Add sections manually or upload a GP file with markers." |
| GP file has single section marker | Create single section spanning entire song (bar 1 to end). |
| Final section has null endTick | Practice Room loop treats null as "to end of song". Display shows "X to end" instead of bar range. |
| Section bars overlap (manual entry) | Form validation prevents: endBar must be >= startBar, and startBar must be > previous section's endBar. |
| Deleting section in middle | Remaining sections' display_order automatically renumbered. Confirm dialog warns about reordering. |
| Re-extract overwrites manual sections | Confirmation dialog explicitly states "This will delete X manually-created sections." |
| Song has no GP chart | STRUCTURE tab still functional for manual section entry. "Extract from GP" button disabled. |
| Multiple GP charts for same song | Use first GP chart for extraction. Show dropdown to select chart if multiple exist. |
| Network error during save | Toast error with retry option. Form retains entered data. |
| User lacks band membership | RLS policy prevents access. UI shows "You don't have access to this song's sections." |

## 8. Testing Strategy

### Unit Tests

| Component/Function | Test Cases |
|--------------------|------------|
| `extractSectionsFromScore()` | Empty score returns []. Single marker creates one section. Multiple markers create correct sections with proper endTick values. Final section has null endTick. |
| `transformSongSection()` | Computes barCount correctly. Handles null tick values. |
| `SectionForm` validation | startBar < endBar fails. Empty name fails. Bar numbers must be positive integers. |

### Integration Tests

| Scenario | Verification |
|----------|--------------|
| Create section flow | Form submit -> API call -> section appears in list -> persists on reload. |
| Delete section flow | Confirm dialog -> API call -> section removed -> display_order updated. |
| GP extraction flow | Upload GP with markers -> sections auto-extracted -> displayed in STRUCTURE tab. |
| Section navigation | Click section in Practice Room -> AlphaTab seeks to correct position. |

### Manual Validation

- [ ] Upload GP file with section markers, verify sections extracted
- [ ] Create manual section, verify persistence across page reload
- [ ] Edit section name and bar range, verify changes saved
- [ ] Delete section, verify removal and reordering
- [ ] In Practice Room, click section to navigate (verify playback position)
- [ ] Verify STRUCTURE tab appears between CHARTS and ASSIGNMENTS
- [ ] Test keyboard navigation through tabs (arrow keys)
- [ ] Test on mobile viewport (responsive layout)

## 9. Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/025_add_song_sections.sql` | Create | Database migration for song_sections table |
| `src/types.ts` | Modify | Add SongSection, SongSectionInput, SectionSource types |
| `src/types/database.types.ts` | Modify | Regenerate Supabase types (via `supabase gen types`) |
| `src/services/supabaseStorageService.ts` | Modify | Add getSongSections, createSection, updateSection, deleteSection, upsertSections methods |
| `src/hooks/useSongSections.ts` | Create | Hook for section CRUD, follows usePracticeSessions pattern |
| `src/lib/sectionExtractor.ts` | Create | extractSectionsFromScore utility |
| `src/components/structure/index.ts` | Create | Barrel export |
| `src/components/structure/StructureTab.tsx` | Create | Main STRUCTURE tab container |
| `src/components/structure/SectionList.tsx` | Create | List of section cards |
| `src/components/structure/SectionCard.tsx` | Create | Single section card component |
| `src/components/structure/SectionForm.tsx` | Create | Section create/edit dialog |
| `src/components/SongDetail.tsx` | Modify | Add STRUCTURE tab (update type union line 74, tabs array line 353, add tabpanel) |
| `src/components/PracticeRoom.tsx` | Modify | Add section navigation pills and handleSectionClick |
| `src/components/practice/SectionNav.tsx` | Create | Section navigation pill bar for Practice Room |

## 10. Open Questions

None - all requirements are clear.

---

## Related Documents

- Architecture: `specs/backlog/feat-song-collaboration-architecture.md`
- Lead Sheet Generation: `specs/backlog/feat-lead-sheet-generation.md`
- GitHub Issue: #196
