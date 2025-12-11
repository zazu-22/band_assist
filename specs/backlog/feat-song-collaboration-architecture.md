# Song Collaboration & Annotation - Architecture Plan

| Field       | Value                    |
| ----------- | ------------------------ |
| **Status**  | Backlog                  |
| **Authors** | Claude & Jason           |
| **Created** | 2025-12-10               |
| **Updated** | 2025-12-10               |
| **Priority**| High                     |
| **Type**    | Architecture             |
| **Effort**  | Large (Multi-Phase)      |

---

## Executive Summary

This document defines the architecture for collaborative song planning and annotation in Band Assist. It unifies three previously separate concepts into a cohesive system:

1. **Song Sections** - Structural breakdown of songs (Intro, Verse, Chorus, Solo, etc.)
2. **Section Assignments** - Who plays what in each section (Lead/Rhythm/Rest)
3. **Annotations** - Timestamped notes, cues, and discussions

---

## Problem Statement

Band members currently have no way to:
- Define and visualize song structure (sections/parts)
- Assign specific roles per section (e.g., "Jason plays lead in the solo, Mike rests")
- Add practice notes or reminders tied to specific positions in songs
- Collaborate on arrangement decisions with persistent discussion

This leads to:
- Verbal agreements that get forgotten
- No clear "who does what when" documentation
- Practice notes lost in group chats
- Confusion during rehearsals and gigs

---

## Unified Solution: Three-Layer Architecture

```
┌────────────────────────────────────────────────────────────────┐
│               LAYER 1: SONG SECTIONS                           │
│  Structural breakdown - auto-extracted from GP or manual       │
│  [Intro 1-8] [Verse 1 9-24] [Chorus 25-40] [Solo 48-72]       │
│                                                                │
│  Data: song_sections table                                     │
│  Source: GP file markers, manual creation, or AlphaTex         │
├────────────────────────────────────────────────────────────────┤
│               LAYER 2: SECTION ASSIGNMENTS                     │
│  Who plays what role in each section                           │
│  Solo: Lead=Jason ● | Rhythm=Mike ○ (REST)                     │
│                                                                │
│  Data: section_assignments table                               │
│  Links: section_id → member_id + role + status                 │
├────────────────────────────────────────────────────────────────┤
│               LAYER 3: ANNOTATIONS                             │
│  Timestamped notes, cues, warnings tied to sections            │
│  💬 "Watch tempo here" ⚠️ "Tends to rush"                      │
│                                                                │
│  Data: song_annotations table                                  │
│  Links: section_id + tick_position + author_id                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Relationship to Existing Specs

This architecture **supersedes and unifies** two existing backlog specs:

| Existing Spec | Status | Integration |
|---------------|--------|-------------|
| `feat-lead-sheet-generation` | Backlog | Becomes **Phase 1: Song Sections** |
| `feat-collaborative-song-notes` | Backlog | Becomes **Phase 3: Annotations** |

Both specs remain valid but should be implemented as phases of this unified architecture rather than standalone features.

---

## Technical Foundation

### AlphaTab 1.7 Capabilities (Required)

The architecture leverages AlphaTab 1.7's new features:

| Feature | Use Case |
|---------|----------|
| **AlphaTex Exporter** | Export GP to text format for debugging/editing |
| **Section Markers** | Extract `masterBars.section` for auto-generation |
| **BoundsLookup API** | Position annotation overlays on rendered score |
| **Beat Mouse Events** | `beatMouseDown/Move/Up` for annotation placement |
| **Beat Lyrics** | Potential marker mechanism |

### Existing Infrastructure to Leverage

| Feature | Location | Integration |
|---------|----------|-------------|
| User-Member Linking | `band_members.user_id` | Know current user's member ID |
| Preferred Instrument | `band_members.preferred_instrument` | Auto-suggest assignments |
| Track Matcher | `src/lib/trackMatcher.ts` | Link GP tracks to instruments |
| Song Parts | `songs.parts` JSON | Legacy - migrate to sections |
| Assignments | `songs.assignments` JSON | Song-level - extend to section-level |
| Supabase Realtime | Already configured | Annotation sync |

---

## Database Schema

### Core Tables

```sql
-- Song structural sections
CREATE TABLE song_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,              -- "Intro", "Verse 1", "Guitar Solo"
  display_order INTEGER NOT NULL,

  -- Position (bar-based from GP)
  start_bar INTEGER,
  end_bar INTEGER,

  -- Position (tick-based for precise playback sync)
  start_tick INTEGER,
  end_tick INTEGER,

  -- Metadata
  time_signature TEXT,             -- "4/4"
  repeat_count INTEGER DEFAULT 1,
  source TEXT DEFAULT 'manual',    -- 'gp_marker' | 'manual' | 'alphatex'
  color TEXT,                      -- For UI highlighting

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(song_id, display_order)
);

-- Section assignments (who plays what per section)
CREATE TABLE section_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES song_sections(id) ON DELETE CASCADE,
  member_id UUID REFERENCES band_members(id) ON DELETE SET NULL,

  role TEXT NOT NULL,              -- "Lead Guitar", "Rhythm Guitar"
  status TEXT DEFAULT 'playing',   -- 'playing' | 'resting' | 'optional'
  notes TEXT,                      -- Section-specific notes

  gp_track_index INTEGER,          -- Link to GP track

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(section_id, member_id, role)
);

-- Annotations (timestamped notes and discussions)
CREATE TABLE song_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),

  -- Flexible positioning
  section_id UUID REFERENCES song_sections(id) ON DELETE SET NULL,
  tick_position INTEGER,           -- For precise GP playback sync
  bar_number INTEGER,              -- Human-readable position

  -- Content
  content TEXT NOT NULL,
  annotation_type TEXT DEFAULT 'note',  -- 'note' | 'cue' | 'warning' | 'question'
  color TEXT DEFAULT 'yellow',

  -- Collaboration
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),

  -- Threading
  parent_id UUID REFERENCES song_annotations(id) ON DELETE CASCADE,

  -- Display during playback
  visible_during_playback BOOLEAN DEFAULT true,
  display_duration_ms INTEGER DEFAULT 3000,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sections_song ON song_sections(song_id, display_order);
CREATE INDEX idx_assignments_section ON section_assignments(section_id);
CREATE INDEX idx_annotations_song ON song_annotations(song_id);
CREATE INDEX idx_annotations_section ON song_annotations(section_id);
```

### TypeScript Types

```typescript
// src/types.ts additions

export interface SongSection {
  id: string;
  songId: string;
  bandId: string;
  name: string;
  displayOrder: number;

  startBar?: number;
  endBar?: number;
  barCount?: number;

  startTick?: number;
  endTick?: number;

  timeSignature?: string;
  repeatCount: number;
  source: 'gp_marker' | 'manual' | 'alphatex';
  color?: string;

  // Denormalized for display
  assignments?: SectionAssignment[];

  createdAt: string;
  updatedAt: string;
}

export interface SectionAssignment {
  id: string;
  sectionId: string;
  memberId: string;
  memberName?: string;

  role: string;
  status: 'playing' | 'resting' | 'optional';
  notes?: string;

  gpTrackIndex?: number;
}

export interface SongAnnotation {
  id: string;
  songId: string;
  bandId: string;
  authorId: string;
  authorName?: string;

  sectionId?: string;
  sectionName?: string;
  tickPosition?: number;
  barNumber?: number;

  content: string;
  type: 'note' | 'cue' | 'warning' | 'question';
  color: 'yellow' | 'red' | 'blue' | 'green';

  isResolved: boolean;
  resolvedBy?: string;
  parentId?: string;

  visibleDuringPlayback: boolean;
  displayDurationMs: number;

  createdAt: string;
  updatedAt: string;
}
```

---

## Component Architecture

### New Component Structure

```
src/components/
├── structure/                      # Song structure features
│   ├── index.ts
│   ├── StructureTab.tsx           # Main STRUCTURE tab container
│   ├── SectionList.tsx            # List of sections
│   ├── SectionItem.tsx            # Single section card
│   ├── SectionEditor.tsx          # Create/edit sections
│   ├── AssignmentEditor.tsx       # Assign members to sections
│   └── TrackActivityIndicator.tsx # ● ◐ ○ indicators
│
├── annotations/                    # Annotation features
│   ├── index.ts
│   ├── AnnotatedChartView.tsx     # AlphaTab + overlay wrapper
│   ├── AnnotationOverlay.tsx      # Canvas layer over AlphaTab
│   ├── SectionMarkerOverlay.tsx   # Visual section markers
│   ├── PlaybackAnnotations.tsx    # Time-synced annotation display
│   ├── AnnotationEditor.tsx       # Add/edit notes
│   ├── AnnotationBubble.tsx       # Single annotation display
│   └── AnnotationPanel.tsx        # Sidebar list view
│
└── hooks/
    ├── useSongSections.ts         # Fetch/manage sections
    ├── useSectionAssignments.ts   # Fetch/manage assignments
    ├── useAnnotations.ts          # Fetch/manage annotations
    └── useRealtimeAnnotations.ts  # Supabase realtime sync
```

### Integration Points

| Existing Component | Integration |
|--------------------|-------------|
| `SongDetail.tsx` | Add STRUCTURE tab, integrate sections |
| `PracticeRoom.tsx` | Section navigation, "Your Assignment" display |
| `PerformanceMode.tsx` | Section markers, playback annotations |
| `AlphaTabRenderer.tsx` | Expose `boundsLookup`, beat events |

---

## UI/UX Design

### Song Detail - STRUCTURE Tab

```
┌────────────────────────────────────────────────────────────────┐
│ OVERVIEW │ CHARTS │ STRUCTURE │ ASSIGNMENTS │ AUDIO           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  📋 Song Structure                      [+ Add Section] [Edit] │
│  Generated from: Lead Guitar.gpx • Dec 10, 2025               │
│                                                                │
│  ┌─ Intro (bars 1-8) ────────────────────────────────────────┐│
│  │  👤 Jason: Lead Guitar ●                                   ││
│  │  👤 Mike: Rhythm Guitar ●                                  ││
│  │  💬 1 note                                    [▶] [Assign] ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                │
│  ┌─ Guitar Solo (bars 48-72) ×2 ─────────────────────────────┐│
│  │  👤 Jason: Lead Guitar ● (primary)                         ││
│  │  👤 Mike: ○ REST                                           ││
│  │  ⚠️ "Watch tempo - tends to rush"             [▶] [Assign] ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                │
│  Legend: ● Playing  ◐ Partial  ○ Resting                      │
└────────────────────────────────────────────────────────────────┘
```

### Practice Room - Section Awareness

```
┌────────────────────────────────────────────────────────────────┐
│  ▶ Play │ 🔄 Loop │ ♩=120 │ 1.0x │ Section: Verse 1    [💬 3] │
├────────────────────────────────────────────────────────────────┤
│  ┌─ Section Navigation ──────────────────────────────────────┐│
│  │ [Intro] [Verse 1▼] [Chorus] [Bridge] [Solo] [Outro]       ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                │
│  ┌─ Your Assignment ─────────────────────────────────────────┐│
│  │  🎸 Rhythm Guitar                                          ││
│  │  💡 "Play rhythm A pattern, accent beat 3"                 ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                │
│  ┌────────────────────────────────────────────────────────────┐
│  │               [AlphaTab Renderer]                          │
│  │        ╔═══════════════════════════════════╗              │
│  │        ║  💬 "Watch tempo here"            ║  ← Annotation │
│  │        ╚═══════════════════════════════════╝              │
│  └────────────────────────────────────────────────────────────┘
└────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 0: AlphaTab 1.7 Upgrade (Prerequisite)
**Spec:** `infra-alphatab-1.7-upgrade.md`
**Effort:** Small (1-2 days)

- Upgrade to `@coderline/alphatab@^1.7.1`
- Verify compatibility
- Test AlphaTex export
- Document new APIs

### Phase 1: Song Sections
**Spec:** Refine `feat-lead-sheet-generation.md`
**Effort:** Medium (3-4 days)

- Create `song_sections` table
- Extract sections from GP markers
- STRUCTURE tab in SongDetail
- Manual section CRUD
- Section navigation in Practice Room

### Phase 2: Section Assignments
**Spec:** New `feat-section-assignments.md`
**Effort:** Medium (3-4 days)

- Create `section_assignments` table
- Assignment UI per section
- Track activity indicators
- Integration with member/role system
- "Your Assignment" display

### Phase 3: Annotations
**Spec:** Refine `feat-collaborative-song-notes.md`
**Effort:** Medium-Large (4-5 days)

- Create `song_annotations` table
- Annotation overlay on AlphaTab
- Real-time sync via Supabase
- Playback-synced display
- Add/edit annotation UI

### Phase 4: Practice Integration
**Spec:** New `feat-practice-section-integration.md`
**Effort:** Small-Medium (2-3 days)

- Section-aware practice logging
- Practice by section UI
- Section navigation shortcuts
- Practice history by section

### Phase 5: AlphaTex Editing (Future)
**Spec:** New `feat-alphatex-editor.md`
**Effort:** Large (1+ week)

- Monaco Editor integration
- AlphaTex syntax highlighting
- Export → Edit → Re-render workflow
- Version history

---

## Dependencies

```
Phase 0 (AlphaTab 1.7)
    │
    ├── Phase 1 (Song Sections)
    │       │
    │       ├── Phase 2 (Section Assignments)
    │       │       │
    │       │       └── Phase 4 (Practice Integration)
    │       │
    │       └── Phase 3 (Annotations)
    │
    └── Phase 5 (AlphaTex Editing) [Future]
```

---

## Migration Strategy

### Existing Data

| Current | Migration |
|---------|-----------|
| `songs.parts` (JSON) | Keep for content; sections are positional overlay |
| `songs.assignments` (JSON) | Keep as song-level default; section assignments override |
| `SongChart.annotations` | Migrate to `song_annotations` table |

### Backward Compatibility

- Songs without sections display normally
- Section features are additive, not replacement
- Existing assignment system continues to work

---

## Success Metrics

| Metric | Target |
|--------|--------|
| GP files with auto-extracted sections | 80%+ have markers |
| Section assignment adoption | 50% of songs within 1 month |
| Annotation usage | 3+ annotations per active song |
| Practice logging by section | 30% of sessions |

---

## Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| GP files lack section markers | Medium | Manual section creation UI |
| AlphaTab 1.7 upgrade issues | Low | Thorough testing, rollback plan |
| Annotation overlay performance | Medium | Throttle updates, limit visible |
| Real-time sync complexity | Medium | Start with polling, add realtime later |

---

## Open Questions

1. **Section granularity**: Per-song or per-chart? (Recommend: per-song)
2. **Assignment inheritance**: Section assignments override or coexist with song-level?
3. **Real-time priority**: Immediate sync or eventual consistency acceptable?

---

## Related Documents

- `specs/backlog/feat-lead-sheet-generation.md` - Phase 1 foundation
- `specs/backlog/feat-collaborative-song-notes.md` - Phase 3 foundation
- `specs/STATUS.md` - Track implementation progress
- GitHub Issue #152 - AlphaTab 1.7 evaluation

---

## Appendix: AlphaTab 1.7 API Reference

### Section Extraction from GP

```typescript
function extractSectionsFromScore(score: AlphaTabScore): SongSection[] {
  const sections: SongSection[] = [];
  let currentSection: Partial<SongSection> | null = null;

  score.masterBars.forEach((masterBar, index) => {
    if (masterBar.section) {
      if (currentSection) {
        currentSection.endBar = index;
        sections.push(currentSection as SongSection);
      }
      currentSection = {
        id: crypto.randomUUID(),
        name: masterBar.section.text,
        displayOrder: sections.length,
        startBar: index + 1,
        source: 'gp_marker',
      };
    }
  });

  // Close final section
  if (currentSection) {
    currentSection.endBar = score.masterBars.length;
    sections.push(currentSection as SongSection);
  }

  return sections;
}
```

### BoundsLookup for Annotations

```typescript
api.renderFinished.on(() => {
  const bounds = api.renderer.boundsLookup;

  annotations.forEach(ann => {
    const beatBounds = bounds.findBeat(
      ann.trackIndex,
      ann.barIndex,
      ann.beatIndex
    );

    if (beatBounds) {
      renderAnnotationOverlay(ann, beatBounds.visualBounds);
    }
  });
});
```

### Beat Mouse Events

```typescript
api.beatMouseDown.on((beat) => {
  const beatRef = {
    trackIndex: beat.voice.bar.staff.track.index,
    barIndex: beat.voice.bar.index,
    voiceIndex: beat.voice.index,
    beatIndex: beat.index
  };

  openAnnotationEditor(beatRef);
});
```
