# Lead Sheet Generation from Guitar Pro Files

| Field       | Value                    |
| ----------- | ------------------------ |
| **Status**  | Backlog                  |
| **Authors** | Claude & Jason           |
| **Created** | 2025-12-02               |
| **Updated** | 2025-12-02               |
| **Priority**| Medium                   |
| **Type**    | Feature                  |
| **Effort**  | Large                    |

---

## Problem Statement

Currently, users manually create lead sheets by:
1. Opening Guitar Pro files in external software
2. Manually noting section markers (Intro, Verse, Chorus, etc.)
3. Tracking which instruments play in which sections
4. Writing this information separately for reference

This is time-consuming and error-prone. Guitar Pro files already contain section markers and multi-track instrument data that can be automatically extracted.

---

## Solution Overview

Auto-generate lead sheets from Guitar Pro files when uploaded, storing them with versioning for history/revert capability. Display in a dedicated "STRUCTURE" tab with instrument-specific views and multiple display formats (detailed for learning, compact for performance).

### Key Features

1. **Auto-generation**: Parse GP files on upload to extract song structure
2. **Per-instrument views**: Show which instruments play/rest in each section
3. **Multiple formats**: Detailed (learning) and compact (performance) views
4. **Versioning**: Keep history of structures, allow revert
5. **Export**: Copy, download, print capabilities
6. **Extensible**: Built for future editability and setlist integration

---

## Phased Implementation

### Phase 1: Core Lead Sheet (This Spec)

- Auto-generate structure from GP files
- Store in separate versioned table
- Display in new STRUCTURE tab
- Track activity per section (playing/resting)
- Export (copy, download)

### Phase 2: Editability (Future Spec)

- Edit section names
- Add/remove sections manually
- Add notes per section
- Add subparts within sections
- Protect from auto-overwrite

### Phase 3: Per-Instrument Analysis (Future Spec)

- Detect entry points and rests per instrument
- Instrument filter in STRUCTURE tab
- Highlight "you come in here" moments

### Phase 4: Setlist Integration (Future Spec)

- Global lead sheet view for setlist (`/setlist/:id/lead-sheets`)
- Compact performance view
- Export entire setlist as printable PDF

---

## Technical Design

### Database Schema

```sql
-- New table for song structures with versioning
CREATE TABLE song_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,

  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  superseded_by UUID REFERENCES song_structures(id),

  -- Source tracking
  generated_from_chart_id UUID, -- References chart that generated this
  is_manually_edited BOOLEAN NOT NULL DEFAULT false,

  -- The actual structure data (JSONB)
  sections JSONB NOT NULL,
  tracks JSONB NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(song_id, version)
);

-- Index for fast lookups
CREATE INDEX idx_song_structures_active
  ON song_structures(song_id)
  WHERE is_active = true;

CREATE INDEX idx_song_structures_band
  ON song_structures(band_id);

-- RLS policies
ALTER TABLE song_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view structures for their bands"
  ON song_structures FOR SELECT
  USING (band_id IN (
    SELECT band_id FROM band_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert structures for their bands"
  ON song_structures FOR INSERT
  WITH CHECK (band_id IN (
    SELECT band_id FROM band_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update structures for their bands"
  ON song_structures FOR UPDATE
  USING (band_id IN (
    SELECT band_id FROM band_members WHERE user_id = auth.uid()
  ));
```

### TypeScript Types

```typescript
// types/structure.ts

export interface SongStructure {
  id: string;
  songId: string;
  bandId: string;
  version: number;
  isActive: boolean;
  supersededBy: string | null;
  generatedFromChartId: string | null;
  isManuallyEdited: boolean;
  sections: StructureSection[];
  tracks: StructureTrack[];
  createdAt: string;
  updatedAt: string;
}

export interface StructureTrack {
  index: number;
  name: string;
  instrument?: string; // Mapped to app's instrument types if possible
}

export interface StructureSection {
  id: string;
  name: string;
  startBar: number;
  endBar: number;
  barCount: number;
  repeatCount: number;        // 1 = no repeat, 2+ = repeated
  timeSignature: string;
  notes: string | null;       // User annotations (Phase 2)
  trackActivity: TrackActivity[];
  subParts: StructureSubPart[]; // Empty for Phase 1
}

export interface TrackActivity {
  trackIndex: number;
  trackName: string;
  status: 'playing' | 'resting' | 'partial';
  noteCount: number;          // Rough activity level
  entersBeat?: number;        // If track enters mid-section (Phase 3)
}

export interface StructureSubPart {
  id: string;
  name: string;
  startBar: number;
  endBar: number;
  notes?: string;
}

// Display configuration
export type StructureView = 'detailed' | 'compact' | 'grid';

export interface StructureDisplayOptions {
  view: StructureView;
  showBarNumbers: boolean;
  showRepeats: boolean;
  filterByTrack: number | null; // Track index or null for all
  highlightRests: boolean;
}
```

### Constants & Configuration

```typescript
// constants/structure.ts

export const STRUCTURE_CONFIG = {
  display: {
    defaultView: 'detailed' as const,
    compactMaxSections: 12,
    barNumberFormat: 'range' as const, // 'range' | 'start' | 'count'
  },
  trackActivity: {
    restThreshold: 0,           // Notes <= this = resting
    partialThreshold: 0.3,      // % of bars with notes for "partial"
  },
  export: {
    formats: ['text', 'markdown', 'json'] as const,
    includeBarNumbers: true,
    includeRepeats: true,
  },
  versioning: {
    maxVersionsToKeep: 10,      // Prune old versions beyond this
  },
} as const;

export const DEFAULT_DISPLAY_OPTIONS: StructureDisplayOptions = {
  view: STRUCTURE_CONFIG.display.defaultView,
  showBarNumbers: true,
  showRepeats: true,
  filterByTrack: null,
  highlightRests: true,
};
```

### Service Layer

```typescript
// services/structureService.ts

export interface StructureService {
  // Parsing
  parseFromScore(score: AlphaTabScore): ParsedStructure;
  analyzeTrackActivity(
    track: AlphaTabTrack,
    startBar: number,
    endBar: number
  ): TrackActivity;

  // Formatting
  formatForExport(
    structure: SongStructure,
    format: ExportFormat,
    options?: Partial<StructureDisplayOptions>
  ): string;
  formatCompact(structure: SongStructure): string;
  formatDetailed(structure: SongStructure): string;

  // Database operations
  fetchActive(songId: string): Promise<SongStructure | null>;
  fetchHistory(songId: string): Promise<SongStructure[]>;
  fetchVersion(songId: string, version: number): Promise<SongStructure | null>;

  save(
    songId: string,
    bandId: string,
    sections: StructureSection[],
    tracks: StructureTrack[],
    chartId?: string
  ): Promise<SongStructure>;

  revertTo(structureId: string): Promise<SongStructure>;

  // Utilities
  shouldAutoUpdate(
    existing: SongStructure | null,
    newSections: StructureSection[]
  ): boolean;
}
```

### Component Structure

```
src/
├── components/
│   └── structure/
│       ├── index.ts                    # Public exports
│       ├── StructureTab.tsx            # Main container
│       ├── StructureHeader.tsx         # Title, source info, actions
│       ├── StructureControls.tsx       # View toggle, instrument filter
│       ├── StructureEmpty.tsx          # No structure state
│       ├── views/
│       │   ├── DetailedView.tsx        # List with full info
│       │   ├── CompactView.tsx         # Horizontal flow
│       │   └── GridView.tsx            # Track activity matrix
│       ├── SectionItem.tsx             # Single section display
│       ├── TrackActivityIndicator.tsx  # ● ◐ ○ indicators
│       ├── StructureExport.tsx         # Export dropdown
│       └── StructureHistory.tsx        # Version history panel
├── hooks/
│   └── useStructure.ts                 # Fetch/manage structure state
├── services/
│   └── structureService.ts             # Business logic
├── constants/
│   └── structure.ts                    # Configuration
└── types/
    └── structure.ts                    # Type definitions
```

---

## User Interface

### STRUCTURE Tab Location

```
SongDetail
├── OVERVIEW
├── CHARTS
├── STRUCTURE  ← New tab
├── ASSIGNMENTS
└── AUDIO
```

### Detailed View (Learning)

```
┌─────────────────────────────────────────────────────────────┐
│ STRUCTURE                                                   │
├─────────────────────────────────────────────────────────────┤
│  📋 Song Structure                                          │
│  Generated from: Lead Guitar.gpx • Dec 2, 2025              │
│                                                             │
│  View: [Detailed ▼]  Track: [All ▼]     [📋 Copy] [⬇ Export]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ├── Intro          bars 1-13    (13 bars)                 │
│  │   Lead ● Rhythm ● Bass ○ Drums ●                        │
│  │                                                         │
│  ├── Verse 1        bars 14-21   (8 bars)                  │
│  │   Lead ● Rhythm ● Bass ● Drums ●                        │
│  │                                                         │
│  ├── Chorus 1       bars 22-29   (8 bars)  ×2              │
│  │   Lead ● Rhythm ● Bass ● Drums ●                        │
│  │                                                         │
│  ├── Guitar Solo    bars 48-71   (24 bars)                 │
│  │   Lead ● Rhythm ○ Bass ◐ Drums ●                        │
│  │                                                         │
│  └── Outro          bars 92-120  (29 bars)                 │
│      Lead ● Rhythm ● Bass ● Drums ●                        │
│                                                             │
│  Legend: ● Playing  ◐ Partial  ○ Resting                   │
└─────────────────────────────────────────────────────────────┘
```

### Compact View (Performance)

```
┌─────────────────────────────────────────────────────────────┐
│ STRUCTURE                                                   │
├─────────────────────────────────────────────────────────────┤
│  View: [Compact ▼]  Track: [All ▼]      [📋 Copy] [⬇ Export]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Intro(13) → V1(8) → Ch×2(8) → V2(8) → Ch×2(10) →          │
│  Solo(24) → V3(8) → Ch(12) → Outro(29)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Grid View (Track Matrix)

```
┌─────────────────────────────────────────────────────────────┐
│  Section      │ Lead │ Rhythm │ Bass │ Drums │              │
│───────────────┼──────┼────────┼──────┼───────┤              │
│  Intro        │  ●   │   ●    │  ○   │   ●   │              │
│  Verse 1      │  ●   │   ●    │  ●   │   ●   │              │
│  Chorus 1 ×2  │  ●   │   ●    │  ●   │   ●   │              │
│  Solo         │  ●   │   ○    │  ◐   │   ●   │              │
│  Outro        │  ●   │   ●    │  ●   │   ●   │              │
└─────────────────────────────────────────────────────────────┘
```

### Empty State

```
┌─────────────────────────────────────────────────────────────┐
│  📋 No Song Structure                                       │
│                                                             │
│  Upload a Guitar Pro file to auto-generate the song         │
│  structure, or the uploaded file may not have section       │
│  markers defined.                                           │
│                                                             │
│  [Go to Charts →]                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Auto-Generation Logic

### When GP File is Uploaded

```typescript
// In chart upload handler (SongDetail.tsx or service)

async function handleGPUpload(file: File, song: Song, bandId: string) {
  // 1. Upload and create chart as normal
  const chart = await uploadChart(file, song);

  // 2. Parse GP file for structure
  const uint8Array = await file.arrayBuffer().then(b => new Uint8Array(b));
  const score = ScoreLoader.loadScoreFromBytes(uint8Array);

  // 3. Extract sections from masterBars
  const sections = extractSections(score.masterBars);

  // 4. Check if sections were found
  if (sections.length === 0) {
    // No section markers - don't overwrite existing structure
    console.log('No section markers found in GP file');
    return;
  }

  // 5. Extract track info
  const tracks = score.tracks.map((t, i) => ({
    index: i,
    name: t.name,
  }));

  // 6. Analyze track activity per section
  for (const section of sections) {
    section.trackActivity = score.tracks.map((track, index) =>
      analyzeTrackActivity(track, section.startBar, section.endBar, index)
    );
  }

  // 7. Check existing structure
  const existing = await structureService.fetchActive(song.id);

  if (existing?.isManuallyEdited) {
    // Prompt user: "Structure was manually edited. Replace?"
    // For Phase 1, we can auto-replace and keep version history
  }

  // 8. Save new structure (creates new version, deactivates old)
  await structureService.save(song.id, bandId, sections, tracks, chart.id);
}
```

### Section Extraction Algorithm

```typescript
function extractSections(masterBars: MasterBar[]): StructureSection[] {
  const sections: StructureSection[] = [];
  let currentSection: Partial<StructureSection> | null = null;

  masterBars.forEach((masterBar, index) => {
    const barNum = index + 1;

    if (masterBar.section) {
      // Close previous section
      if (currentSection) {
        currentSection.endBar = index;
        currentSection.barCount = currentSection.endBar - currentSection.startBar + 1;
        sections.push(currentSection as StructureSection);
      }

      // Start new section
      currentSection = {
        id: crypto.randomUUID(),
        name: masterBar.section.text || masterBar.section.marker || `Section ${sections.length + 1}`,
        startBar: barNum,
        endBar: barNum, // Will be updated
        barCount: 1,
        repeatCount: 1,
        timeSignature: `${masterBar.timeSignatureNumerator}/${masterBar.timeSignatureDenominator}`,
        notes: null,
        trackActivity: [],
        subParts: [],
      };
    }

    // Track repeat count
    if (masterBar.repeatCount > 0 && currentSection) {
      currentSection.repeatCount = masterBar.repeatCount;
    }
  });

  // Close final section
  if (currentSection) {
    currentSection.endBar = masterBars.length;
    currentSection.barCount = currentSection.endBar - currentSection.startBar + 1;
    sections.push(currentSection as StructureSection);
  }

  return sections;
}
```

### Track Activity Analysis

```typescript
function analyzeTrackActivity(
  track: AlphaTabTrack,
  startBar: number,
  endBar: number,
  trackIndex: number
): TrackActivity {
  let noteCount = 0;
  let barsWithNotes = 0;
  const totalBars = endBar - startBar + 1;

  for (let barIndex = startBar - 1; barIndex < endBar; barIndex++) {
    const bar = track.staves[0]?.bars[barIndex];
    if (!bar) continue;

    let barHasNotes = false;
    for (const voice of bar.voices) {
      for (const beat of voice.beats) {
        if (beat.notes.length > 0 && !beat.isRest) {
          noteCount += beat.notes.length;
          barHasNotes = true;
        }
      }
    }
    if (barHasNotes) barsWithNotes++;
  }

  const activityRatio = barsWithNotes / totalBars;

  let status: 'playing' | 'resting' | 'partial';
  if (noteCount <= STRUCTURE_CONFIG.trackActivity.restThreshold) {
    status = 'resting';
  } else if (activityRatio < STRUCTURE_CONFIG.trackActivity.partialThreshold) {
    status = 'partial';
  } else {
    status = 'playing';
  }

  return {
    trackIndex,
    trackName: track.name,
    status,
    noteCount,
  };
}
```

---

## Export Formats

### Plain Text

```
"GIMME ALL YOUR LOVIN'" - ZZ Top
120 BPM

STRUCTURE:
├── Intro          bars 1-13    (13 bars)
├── Verse 1        bars 14-21   (8 bars)
├── Chorus 1       bars 22-29   (8 bars)  ×2
├── Verse 2        bars 30-37   (8 bars)
├── Chorus 2       bars 38-47   (10 bars) ×2
├── Guitar Solo    bars 48-71   (24 bars)
├── Verse 3        bars 72-79   (8 bars)
├── Chorus 3       bars 80-91   (12 bars)
└── Outro          bars 92-120  (29 bars)

TRACKS: Lead Guitar, Rhythm Guitar, Bass, Drums
```

### Compact (for performance cheat sheet)

```
Intro(13) → V1(8) → Ch×2(8) → V2(8) → Ch×2(10) → Solo(24) → V3(8) → Ch(12) → Out(29)
```

### JSON (for integration/backup)

```json
{
  "title": "GIMME ALL YOUR LOVIN'",
  "artist": "ZZ Top",
  "tempo": 120,
  "sections": [
    { "name": "Intro", "startBar": 1, "endBar": 13, "barCount": 13, "repeatCount": 1 },
    { "name": "Verse 1", "startBar": 14, "endBar": 21, "barCount": 8, "repeatCount": 1 }
  ],
  "tracks": ["Lead Guitar", "Rhythm Guitar", "Bass", "Drums"]
}
```

---

## Acceptance Criteria

### Phase 1 Must-Haves

- [ ] Database migration creates `song_structures` table with versioning
- [ ] TypeScript types defined in `types/structure.ts`
- [ ] Constants defined in `constants/structure.ts`
- [ ] Structure service with parsing and CRUD operations
- [ ] Auto-generate structure when GP file uploaded
- [ ] Only generate if GP file has section markers
- [ ] Don't overwrite if new GP lacks markers
- [ ] New "STRUCTURE" tab in SongDetail
- [ ] Detailed view shows sections with bar ranges
- [ ] Track activity indicators (●/◐/○) per section
- [ ] Instrument filter dropdown
- [ ] Copy to clipboard button
- [ ] Download as text file button
- [ ] Empty state when no structure exists
- [ ] Version history stored (for future revert UI)

### Phase 1 Nice-to-Haves

- [ ] Compact view toggle
- [ ] Grid view (track matrix)
- [ ] Version history UI with revert

### Out of Scope for Phase 1

- Manual editing of sections
- Adding notes/subparts
- Setlist-wide lead sheet view
- Print functionality
- PDF export

---

## Testing Strategy

### Unit Tests

- `structureService.parseFromScore()` - various GP structures
- `structureService.analyzeTrackActivity()` - playing/resting/partial detection
- `structureService.formatForExport()` - all export formats
- Section extraction with edge cases (no markers, single section, etc.)

### Integration Tests

- Upload GP file → structure auto-generated
- Upload GP without markers → no structure created
- Upload new GP → new version created, old preserved
- Fetch active structure for song

### E2E Tests

- Upload GP file, navigate to STRUCTURE tab, verify sections displayed
- Filter by instrument, verify correct tracks highlighted
- Copy to clipboard, verify content
- Download, verify file contents

---

## Migration Path

1. Create database migration
2. Add types and constants
3. Implement structure service
4. Add hook for fetching structure
5. Build STRUCTURE tab components
6. Integrate auto-generation into GP upload flow
7. Add to SongDetail tab navigation

---

## Future Considerations

- **Setlist view**: `/setlist/:id/lead-sheets` showing all songs' structures
- **Conflict resolution UI**: When manually edited and new GP uploaded
- **AI enhancement**: Suggest section names if markers are generic
- **Sync with playback**: Highlight current section during AlphaTab playback
- **Mobile optimization**: Swipeable compact view for phones

---

## Related Specs

- None currently (this is foundational)

## Dependencies

- AlphaTab library (already integrated)
- Supabase (already integrated)
