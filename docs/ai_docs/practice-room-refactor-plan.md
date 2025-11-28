# Practice Room Unified Control Bar Refactor

## Overview

This document outlines a refactoring plan to address layout and UX issues in the Practice Room module, with particular focus on the AlphaTab Guitar Pro viewer integration.

**Date Created:** 2025-11-27
**Status:** Planning
**Related Files:**

- `src/components/PracticeRoom.tsx`
- `src/components/AlphaTabRenderer.tsx`

---

## Problem Statement

### Current Issues

1. **Excessive Vertical Space Consumption**
   - Practice Room header (song title, toggle, metronome): ~56px
   - Chart selector row: ~48px
   - AlphaTab toolbar: ~48px
   - AlphaTab progress bar: ~40px
   - **Total overhead: ~192px** before any actual music content

2. **Layout Instability**
   - When song list panel collapses, the chart selector tabs shift position
   - Creates jarring visual movement that disrupts user focus
   - Toggle button stays anchored left while chart tabs jump from right to left

3. **Visual Inconsistency**
   - AlphaTab controls use zinc/white color scheme, not the app's amber/dark theme
   - No serif fonts (Brawler) for headers as per design system
   - No JetBrains Mono for numeric displays (BPM, time)
   - Plain HTML buttons instead of shadcn/ui Button components
   - Missing TooltipProvider patterns

4. **Poor Responsive Behavior**
   - AlphaTab toolbar overflows on narrow screens
   - BPM slider, metronome indicators, track selector compete for space
   - No graceful degradation for mobile viewports

### Screenshots Reference

- Expanded song list: Shows wasted vertical space
- Collapsed song list: Shows chart tab position shift
- Narrow viewport: Shows toolbar overflow issues

---

## Proposed Solution

### Architecture Change

**Before:**

```
┌─────────────────────────────────────────────────────────┐
│ PracticeRoom Header (toggle | title | metronome)        │
├─────────────────────────────────────────────────────────┤
│ Song List │ Chart Selector Tabs                         │
│           ├─────────────────────────────────────────────┤
│           │ AlphaTabRenderer                            │
│           │ ┌─────────────────────────────────────────┐ │
│           │ │ AT Toolbar (play|track|BPM|metronome)   │ │
│           │ ├─────────────────────────────────────────┤ │
│           │ │ AT Progress Bar                         │ │
│           │ ├─────────────────────────────────────────┤ │
│           │ │ Score Rendering                         │ │
│           │ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**After:**

```
┌─────────────────────────────────────────────────────────┐
│ Unified Control Bar                                     │
│ [☰] Title/BPM | [▶][■][↻] | ChartTabs | Track | ♩=120  │
├─────────────────────────────────────────────────────────┤
│ Song List │ Progress Bar (when GP active)               │
│           ├─────────────────────────────────────────────┤
│           │ Content Area                                │
│           │ - AlphaTabRenderer (score only)             │
│           │ - Or: SmartTabEditor                        │
│           │ - Or: PDF/Image viewer                      │
└─────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Single Source of Truth**: All playback state lives in PracticeRoom
2. **AlphaTab as Pure Renderer**: Exposes API via ref, renders score only
3. **Unified Controls**: One toolbar handles all chart types
4. **Stable Layout**: Chart selector position independent of song list state
5. **Design System Compliance**: All controls follow established patterns

---

## Implementation Phases

### Phase 1: AlphaTab API Extraction

**Goal:** Make AlphaTabRenderer controllable from parent component

**Changes:**

1. Create `AlphaTabHandle` interface for imperative control
2. Use `useImperativeHandle` to expose API methods
3. Add props for externalized state (isPlaying, currentTime, etc.)
4. Remove internal toolbar UI (keep as optional prop for backwards compat)
5. Keep progress bar logic but make it optional/externalized

**New Interface:**

```typescript
interface AlphaTabHandle {
  play(): void;
  pause(): void;
  stop(): void;
  seekTo(percentage: number): void;
  setPlaybackSpeed(speed: number): void;
  setLoop(enabled: boolean): void;
  setLoopRange(range: { start: number; end: number } | null): void;
  renderTrack(index: number): void;
  toggleTrackMute(index: number): void;
  toggleTrackSolo(index: number): void;
}

interface AlphaTabRendererProps {
  fileData: string;
  readOnly?: boolean;
  showControls?: boolean; // Default false after refactor
  showProgressBar?: boolean; // Default false after refactor
  onReady?: (handle: AlphaTabHandle) => void;
  onStateChange?: (state: AlphaTabState) => void;
  onPositionChange?: (current: number, total: number) => void;
  onTracksLoaded?: (tracks: TrackInfo[]) => void;
  onError?: (error: string) => void;
}

interface AlphaTabState {
  isPlaying: boolean;
  isLooping: boolean;
  currentSpeed: number;
  currentBPM: number;
  originalTempo: number;
  currentTrackIndex: number;
  metronomeBeat: number;
}
```

**Files Modified:**

- `src/components/AlphaTabRenderer.tsx`

**Estimated Complexity:** Medium
**Risk:** Low (backwards compatible with showControls prop)

**Acceptance Criteria:**

1. [ ] `AlphaTabHandle` interface is exported and documented
2. [ ] `useImperativeHandle` exposes all playback methods (play, pause, stop, seekTo, setPlaybackSpeed, setLoop, setLoopRange, renderTrack, toggleTrackMute, toggleTrackSolo)
3. [ ] `onReady` callback fires with handle when player is ready
4. [ ] `onStateChange` callback fires on every playback state change
5. [ ] `onPositionChange` callback fires with current/total time (throttled)
6. [ ] `onTracksLoaded` callback fires with track list when score loads
7. [ ] `onError` callback fires on AlphaTab errors
8. [ ] `showControls={true}` renders existing toolbar (backwards compat)
9. [ ] `showControls={false}` renders only the score area
10. [ ] All existing AlphaTabRenderer tests pass
11. [ ] No TypeScript errors

**Tests to Write/Update:**

```typescript
// src/components/AlphaTabRenderer.test.tsx

describe('AlphaTabRenderer API Extraction', () => {
  describe('imperative handle', () => {
    it('calls onReady with handle when player is ready', async () => {});
    it('handle.play() triggers playback', async () => {});
    it('handle.pause() pauses playback', async () => {});
    it('handle.stop() stops and resets playback', async () => {});
    it('handle.seekTo() moves playback position', async () => {});
    it('handle.setPlaybackSpeed() changes tempo', async () => {});
    it('handle.setLoop() toggles loop mode', async () => {});
    it('handle.renderTrack() switches displayed track', async () => {});
    it('handle.toggleTrackMute() mutes/unmutes track', async () => {});
    it('handle.toggleTrackSolo() solos/unsolos track', async () => {});
  });

  describe('callbacks', () => {
    it('onStateChange fires when playback starts', async () => {});
    it('onStateChange fires when playback pauses', async () => {});
    it('onStateChange fires when speed changes', async () => {});
    it('onPositionChange fires during playback (throttled)', async () => {});
    it('onTracksLoaded fires with track array on score load', async () => {});
    it('onError fires when file fails to load', async () => {});
  });

  describe('showControls prop', () => {
    it('renders toolbar when showControls={true}', () => {});
    it('hides toolbar when showControls={false}', () => {});
    it('defaults to showControls={false}', () => {});
  });
});
```

---

### Phase 2: Unified Control Bar Component

**Goal:** Create a new component that handles all playback controls

**New Component:** `PracticeControlBar.tsx`

**Responsibilities:**

- Song list toggle button
- Song title and metadata display
- Playback controls (play/pause/stop/loop)
- Chart type selector tabs
- Track selector (for GP files)
- BPM/tempo control with slider
- Visual metronome indicator
- Progress bar (integrated or separate row)

**Props Interface:**

```typescript
interface PracticeControlBarProps {
  // Song info
  song: Song | null;

  // Song list
  showSongList: boolean;
  onToggleSongList: () => void;

  // Chart selection
  charts: SongChart[];
  activeChartId: string | null;
  onSelectChart: (id: string) => void;

  // Playback state (for GP)
  isGuitarPro: boolean;
  playbackState?: {
    isPlaying: boolean;
    isLooping: boolean;
    currentTime: number;
    totalTime: number;
    currentBPM: number;
    originalTempo: number;
    metronomeBeat: number;
  };

  // Playback controls (for GP)
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onSeek?: (percentage: number) => void;
  onToggleLoop?: () => void;
  onSetBPM?: (bpm: number) => void;

  // Track controls (for GP)
  tracks?: TrackInfo[];
  currentTrackIndex?: number;
  onSelectTrack?: (index: number) => void;
  onToggleTrackMute?: (index: number) => void;
  onToggleTrackSolo?: (index: number) => void;

  // Non-GP controls
  metronomeState?: {
    bpm: number;
    isActive: boolean;
  };
  onMetronomeBpmChange?: (bpm: number) => void;
  onMetronomeToggle?: () => void;
}
```

**Layout Structure:**

```tsx
<header className="border-b border-border bg-card shrink-0">
  {/* Main control row */}
  <div className="flex items-center gap-4 px-4 py-2">
    {/* Left: Toggle + Song info */}
    <div className="flex items-center gap-3 min-w-0">
      <ToggleButton />
      <SongTitle />
    </div>

    {/* Center: Playback + Charts */}
    <div className="flex-1 flex items-center justify-center gap-4">
      {isGuitarPro && <PlaybackControls />}
      <ChartTabs />
    </div>

    {/* Right: Track/BPM/Metronome */}
    <div className="flex items-center gap-3 shrink-0">
      {isGuitarPro ? <GPControls /> : <MetronomeControls />}
    </div>
  </div>

  {/* Progress bar row (GP only) */}
  {isGuitarPro && playbackState && <ProgressBar />}
</header>
```

**Files Created:**

- `src/components/practice/PracticeControlBar.tsx`
- `src/components/practice/PlaybackControls.tsx`
- `src/components/practice/TrackSelector.tsx`
- `src/components/practice/TempoControl.tsx`
- `src/components/practice/MetronomeIndicator.tsx`
- `src/components/practice/ProgressBar.tsx`
- `src/components/practice/index.ts`

**Estimated Complexity:** High
**Risk:** Medium (new component, but isolated)

**Acceptance Criteria:**

1. [ ] `PracticeControlBar` renders all required sections (left/center/right)
2. [ ] Song list toggle button works and shows correct icon state
3. [ ] Song title and BPM/key metadata display correctly
4. [ ] Chart tabs render for all chart types with correct icons
5. [ ] Clicking chart tab calls `onSelectChart` with correct ID
6. [ ] Active chart tab has visual distinction
7. [ ] Playback controls (play/pause/stop/loop) render for GP charts only
8. [ ] Track selector dropdown shows all tracks
9. [ ] BPM slider adjusts tempo within valid range
10. [ ] Metronome indicator shows beat pulses
11. [ ] Progress bar shows current position and allows seeking
12. [ ] All controls have proper ARIA labels
13. [ ] No TypeScript errors

**Tests to Write:**

```typescript
// src/components/practice/PracticeControlBar.test.tsx

describe('PracticeControlBar', () => {
  describe('song info', () => {
    it('displays song title', () => {});
    it('displays BPM', () => {});
    it('displays key when available', () => {});
    it('shows placeholder when no song selected', () => {});
  });

  describe('song list toggle', () => {
    it('renders toggle button', () => {});
    it('calls onToggleSongList when clicked', () => {});
    it('shows PanelLeftClose icon when list is visible', () => {});
    it('shows PanelLeftOpen icon when list is hidden', () => {});
  });

  describe('chart tabs', () => {
    it('renders tab for each chart', () => {});
    it('shows correct icon per chart type (GP, PDF, TEXT, IMAGE)', () => {});
    it('highlights active chart', () => {});
    it('calls onSelectChart when tab clicked', () => {});
  });

  describe('playback controls (GP mode)', () => {
    it('renders play/pause/stop/loop buttons when isGuitarPro=true', () => {});
    it('hides playback controls when isGuitarPro=false', () => {});
    it('shows pause icon when playing', () => {});
    it('shows play icon when paused', () => {});
    it('calls onPlay when play clicked', () => {});
    it('calls onPause when pause clicked', () => {});
    it('calls onStop when stop clicked', () => {});
    it('calls onToggleLoop when loop clicked', () => {});
    it('highlights loop button when looping', () => {});
  });

  describe('track selector', () => {
    it('renders when tracks are provided', () => {});
    it('displays current track name', () => {});
    it('opens dropdown on click', () => {});
    it('calls onSelectTrack when track selected', () => {});
    it('shows mute/solo controls per track', () => {});
  });

  describe('tempo control', () => {
    it('displays current BPM', () => {});
    it('slider adjusts BPM', () => {});
    it('calls onSetBPM with new value', () => {});
    it('shows reset button when tempo modified', () => {});
  });

  describe('metronome indicator', () => {
    it('renders 4 beat indicators', () => {});
    it('highlights current beat', () => {});
    it('no highlight when metronomeBeat is 0', () => {});
  });

  describe('progress bar', () => {
    it('renders when playbackState provided', () => {});
    it('shows current time formatted as m:ss', () => {});
    it('shows total time formatted as m:ss', () => {});
    it('progress fill width matches percentage', () => {});
    it('clicking bar calls onSeek with percentage', () => {});
  });
});

// src/components/practice/PlaybackControls.test.tsx
describe('PlaybackControls', () => {
  it('disables buttons when not ready', () => {});
  it('all buttons have aria-label', () => {});
  it('all buttons have tooltip', () => {});
});

// src/components/practice/TempoControl.test.tsx
describe('TempoControl', () => {
  it('clamps BPM to valid range (25%-200% of original)', () => {});
  it('direct input accepts valid numbers', () => {});
  it('direct input rejects invalid input', () => {});
});

// src/components/practice/ProgressBar.test.tsx
describe('ProgressBar', () => {
  it('handles zero duration gracefully', () => {});
  it('clamps seek to 0-100%', () => {});
});
```

---

### Phase 3: PracticeRoom Integration

**Goal:** Wire up new control bar and simplified AlphaTabRenderer

**Changes to PracticeRoom.tsx:**

1. Import and use `PracticeControlBar`
2. Lift AlphaTab state to PracticeRoom level
3. Use ref to control AlphaTabRenderer
4. Remove duplicate header/toolbar code
5. Consolidate chart selector into control bar
6. Handle state synchronization between components

**State to Lift:**

```typescript
// AlphaTab-specific state (only when GP chart active)
const [alphaTabHandle, setAlphaTabHandle] = useState<AlphaTabHandle | null>(null);
const [gpPlaybackState, setGpPlaybackState] = useState<PlaybackState | null>(null);
const [gpTracks, setGpTracks] = useState<TrackInfo[]>([]);
const [gpCurrentTrack, setGpCurrentTrack] = useState<number>(0);
```

**Files Modified:**

- `src/components/PracticeRoom.tsx`

**Estimated Complexity:** High
**Risk:** Medium (significant restructure)

**Acceptance Criteria:**

1. [ ] PracticeRoom renders `PracticeControlBar` instead of old header
2. [ ] Old chart selector row is removed
3. [ ] AlphaTabRenderer renders with `showControls={false}`
4. [ ] AlphaTab handle is captured via `onReady` callback
5. [ ] Playback state syncs from AlphaTab to control bar UI
6. [ ] Control bar callbacks correctly invoke AlphaTab handle methods
7. [ ] Chart switching works (GP ↔ TEXT ↔ PDF ↔ IMAGE)
8. [ ] Non-GP charts show metronome controls (existing functionality preserved)
9. [ ] Non-GP charts show backing track player (existing functionality preserved)
10. [ ] Song list toggle still works
11. [ ] Song selection still works
12. [ ] No regressions in existing PracticeRoom tests
13. [ ] Total toolbar height ≤ 100px (measured)

**Tests to Write/Update:**

```typescript
// src/components/PracticeRoom.test.tsx

describe('PracticeRoom Integration', () => {
  describe('control bar integration', () => {
    it('renders PracticeControlBar', () => {});
    it('does not render old header elements', () => {});
    it('does not render separate chart selector row', () => {});
  });

  describe('AlphaTab control', () => {
    it('renders AlphaTabRenderer with showControls=false for GP charts', () => {});
    it('play button triggers AlphaTab playback', () => {});
    it('pause button pauses AlphaTab playback', () => {});
    it('stop button stops and resets AlphaTab', () => {});
    it('tempo slider changes AlphaTab playback speed', () => {});
    it('track selector changes rendered track', () => {});
    it('progress bar reflects AlphaTab position', () => {});
    it('seeking updates AlphaTab position', () => {});
  });

  describe('state synchronization', () => {
    it('control bar shows playing state when AlphaTab plays', () => {});
    it('control bar shows paused state when AlphaTab pauses', () => {});
    it('BPM display updates when tempo changes', () => {});
    it('metronome indicator pulses on beat', () => {});
    it('track list populates from AlphaTab', () => {});
  });

  describe('chart type switching', () => {
    it('switching to GP chart shows playback controls', () => {});
    it('switching to TEXT chart hides playback controls', () => {});
    it('switching to PDF chart hides playback controls', () => {});
    it('switching charts preserves song list state', () => {});
  });

  describe('backwards compatibility', () => {
    it('metronome works for non-GP charts', () => {});
    it('backing track player works for non-GP charts', () => {});
    it('song list toggle works', () => {});
    it('song selection works', () => {});
  });

  describe('layout stability', () => {
    it('chart tabs do not shift when song list toggles', () => {
      // Measure chart tab position before toggle
      // Toggle song list
      // Measure chart tab position after toggle
      // Assert positions are equal
    });
  });
});
```

---

### Phase 4: Design System Alignment

**Goal:** Apply design system patterns to all new components

**Typography Updates:**

- Song title: `font-serif` (Brawler)
- BPM/time displays: `font-mono tabular-nums` (JetBrains Mono)
- Labels: `text-xs uppercase tracking-wide`

**Component Updates:**

- Replace plain buttons with shadcn/ui `Button`
- Add `TooltipProvider` + `Tooltip` to all icon buttons
- Use proper status colors (`--success`, `--info`, `--warning`)
- Apply consistent spacing (`gap-2`, `gap-3`, `gap-4`)
- Add proper focus states (`focus-visible:ring-2`)

**Animation Updates:**

- Add `transition-colors` to interactive elements
- Use `animate-fade-in` for control bar appearance
- Add `motion-reduce:transition-none` for accessibility

**Files Modified:**

- All Phase 2 components
- `src/components/AlphaTabRenderer.tsx` (loading/error states)

**Estimated Complexity:** Medium
**Risk:** Low (styling only)

**Acceptance Criteria:**

1. [ ] Song title uses `font-serif` (Brawler)
2. [ ] BPM and time displays use `font-mono tabular-nums` (JetBrains Mono)
3. [ ] Labels use `text-xs uppercase tracking-wide`
4. [ ] All buttons use shadcn/ui `Button` component
5. [ ] All icon buttons have `TooltipProvider` + `Tooltip`
6. [ ] Active/playing states use `--primary` color
7. [ ] Loop active state is visually distinct
8. [ ] Progress bar uses `--primary` for fill
9. [ ] Metronome beat highlight uses `--primary`
10. [ ] Track selector uses `DropdownMenu` primitive
11. [ ] Loading spinner in AlphaTab uses `--primary`
12. [ ] Error state in AlphaTab uses `--destructive`
13. [ ] All interactive elements have `transition-colors`
14. [ ] All animations respect `motion-reduce:transition-none`
15. [ ] Visual comparison against design system doc passes review

**Tests to Write:**

```typescript
// Visual/snapshot tests for design system compliance

describe('Design System Compliance', () => {
  describe('typography', () => {
    it('song title has font-serif class', () => {});
    it('BPM display has font-mono tabular-nums classes', () => {});
    it('time display has font-mono tabular-nums classes', () => {});
  });

  describe('components', () => {
    it('play button is shadcn Button component', () => {});
    it('icon buttons have Tooltip wrapper', () => {});
    it('track selector uses DropdownMenu', () => {});
  });

  describe('colors', () => {
    it('active play button uses primary color', () => {});
    it('loop active uses primary color', () => {});
    it('progress bar fill uses primary color', () => {});
    it('error states use destructive color', () => {});
  });

  describe('accessibility', () => {
    it('all buttons have aria-label', () => {});
    it('tooltips appear on hover', () => {});
    it('focus-visible ring appears on keyboard focus', () => {});
    it('reduced motion preference disables animations', () => {});
  });
});
```

---

### Phase 5: Responsive Behavior

**Goal:** Graceful degradation on narrow viewports

**Breakpoint Strategy:**

| Viewport            | Behavior                         |
| ------------------- | -------------------------------- |
| Desktop (≥1024px)   | Full controls visible            |
| Tablet (768-1023px) | Compact BPM slider, smaller gaps |
| Mobile (<768px)     | Icon-only buttons, overflow menu |

**Mobile Adaptations:**

1. Song title truncates with ellipsis
2. Chart tabs become horizontal scroll
3. BPM control moves to dropdown/modal
4. Track selector becomes sheet/modal
5. Metronome indicator simplified (single dot)

**Implementation:**

```tsx
// Responsive classes
<Button variant="ghost" size="sm" className="h-9 w-9 lg:w-auto lg:px-3">
  <Play size={18} />
  <span className="hidden lg:inline ml-2">Play</span>
</Button>
```

**New Components (if needed):**

- `MobileControlSheet.tsx` - Bottom sheet for mobile controls

**Files Modified:**

- All Phase 2 components
- `src/components/PracticeRoom.tsx`

**Estimated Complexity:** Medium
**Risk:** Low (progressive enhancement)

**Acceptance Criteria:**

1. [ ] Desktop (≥1024px): All controls visible, full labels
2. [ ] Tablet (768-1023px): Compact layout, icon buttons with tooltips
3. [ ] Mobile (<768px): Icon-only buttons, overflow menu for secondary controls
4. [ ] Song title truncates with ellipsis on narrow screens
5. [ ] Chart tabs horizontally scroll when they overflow
6. [ ] BPM slider accessible via popover on mobile
7. [ ] Track selector accessible via sheet on mobile
8. [ ] No horizontal overflow at 320px width
9. [ ] Touch targets ≥ 44px on mobile
10. [ ] Control bar height adapts appropriately per breakpoint

**Tests to Write:**

```typescript
// src/components/practice/PracticeControlBar.responsive.test.tsx

describe('PracticeControlBar Responsive', () => {
  describe('desktop (1024px+)', () => {
    beforeEach(() => {
      // Set viewport to 1024px
    });

    it('shows full text labels on buttons', () => {});
    it('shows BPM slider inline', () => {});
    it('shows track selector inline', () => {});
  });

  describe('tablet (768-1023px)', () => {
    beforeEach(() => {
      // Set viewport to 800px
    });

    it('hides text labels on buttons', () => {});
    it('shows icon-only buttons with tooltips', () => {});
    it('compact BPM control', () => {});
  });

  describe('mobile (<768px)', () => {
    beforeEach(() => {
      // Set viewport to 375px
    });

    it('shows overflow menu button', () => {});
    it('BPM control in overflow menu', () => {});
    it('track selector opens as sheet', () => {});
    it('chart tabs scroll horizontally', () => {});
    it('no horizontal overflow', () => {});
  });

  describe('minimum width (320px)', () => {
    beforeEach(() => {
      // Set viewport to 320px
    });

    it('renders without horizontal scroll', () => {});
    it('all controls accessible', () => {});
    it('touch targets meet 44px minimum', () => {});
  });
});
```

---

### Phase 6: Testing & Polish

**Goal:** Ensure reliability and smooth UX

**Testing Focus:**

1. Unit tests for new components
2. Integration tests for playback state sync
3. Visual regression tests for responsive behavior
4. Accessibility audit (keyboard nav, screen readers)

**Polish Items:**

1. Loading states during chart switching
2. Error handling for AlphaTab failures
3. Smooth transitions between chart types
4. Keyboard shortcuts (Space = play/pause, etc.)

**Files Created/Modified:**

- `src/components/practice/*.test.tsx`
- `src/components/AlphaTabRenderer.test.tsx` (updates)

**Estimated Complexity:** Medium
**Risk:** Low

**Acceptance Criteria:**

1. [ ] All Phase 1-5 tests pass
2. [ ] Test coverage ≥ 80% for new components
3. [ ] No console errors or warnings during normal usage
4. [ ] Loading state displays while AlphaTab initializes
5. [ ] Error state displays when AlphaTab fails
6. [ ] Smooth transitions when switching chart types
7. [ ] Space bar toggles play/pause when focused on controls
8. [ ] Escape key closes open dropdowns/sheets
9. [ ] Tab navigation works through all controls
10. [ ] Screen reader can navigate and operate all controls
11. [ ] TypeScript strict mode passes
12. [ ] ESLint passes with no errors
13. [ ] Build succeeds with no warnings

**Tests to Write:**

```typescript
// Integration and E2E style tests

describe('Practice Room E2E', () => {
  describe('full workflow', () => {
    it('loads song list, selects song, plays GP chart', async () => {
      // Render PracticeRoom with test data
      // Click on a song
      // Verify chart loads
      // Click play
      // Verify playback starts
      // Verify progress bar moves
      // Click pause
      // Verify playback stops
    });

    it('switches between chart types', async () => {
      // Load song with multiple chart types
      // Switch from GP to TEXT
      // Verify TEXT chart renders
      // Verify playback controls hidden
      // Switch back to GP
      // Verify GP chart renders
      // Verify playback controls shown
    });

    it('handles AlphaTab load failure gracefully', async () => {
      // Provide invalid GP file data
      // Verify error state displays
      // Verify retry button works
    });
  });

  describe('keyboard navigation', () => {
    it('Space toggles play/pause', () => {});
    it('Tab navigates through controls', () => {});
    it('Escape closes dropdowns', () => {});
    it('Arrow keys adjust sliders', () => {});
  });

  describe('accessibility audit', () => {
    it('passes axe-core audit', async () => {
      // Run axe-core on rendered component
      // Assert no violations
    });
  });
});
```

**Polish Checklist:**

- [ ] Loading skeleton matches final layout dimensions
- [ ] Error message is user-friendly and actionable
- [ ] Transitions are smooth (no jarring jumps)
- [ ] Hover states are consistent
- [ ] Focus states are visible and consistent
- [ ] Touch interactions feel responsive
- [ ] No layout shifts during interactions

---

## Implementation Order

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6
   │           │           │           │           │           │
   │           │           │           │           │           │
Extract     Create      Integrate   Style to    Make        Test &
AlphaTab    Control     into        Design      Responsive  Polish
API         Bar         Practice    System
            Components  Room
```

**Recommended Checkpoints:**

- After Phase 1: AlphaTab still works with internal controls
- After Phase 3: Full functionality with new architecture
- After Phase 5: Production-ready

---

## File Structure After Refactor

```
src/components/
├── practice/
│   ├── index.ts
│   ├── PracticeControlBar.tsx
│   ├── PlaybackControls.tsx
│   ├── ChartTabs.tsx
│   ├── TrackSelector.tsx
│   ├── TempoControl.tsx
│   ├── MetronomeIndicator.tsx
│   ├── ProgressBar.tsx
│   └── MobileControlSheet.tsx (if needed)
├── PracticeRoom.tsx (refactored)
├── AlphaTabRenderer.tsx (simplified)
└── ...
```

---

## Risks & Mitigations

| Risk                        | Impact | Mitigation                                      |
| --------------------------- | ------ | ----------------------------------------------- |
| AlphaTab API instability    | High   | Keep `showControls` prop for fallback           |
| State sync complexity       | Medium | Use reducer pattern for playback state          |
| Mobile usability regression | Medium | Test on real devices early                      |
| Performance overhead        | Low    | Memoize callbacks, avoid unnecessary re-renders |

---

## Success Criteria

1. **Vertical Space**: ≤100px toolbar overhead (vs current ~192px)
2. **Layout Stability**: Zero position shift when toggling song list
3. **Visual Consistency**: All controls match design system
4. **Responsive**: Usable on 320px viewport width
5. **Performance**: No perceptible lag in playback controls
6. **Accessibility**: Full keyboard navigation, ARIA labels

---

## Notes

- AlphaTab's internal player state is the source of truth for playback
- PracticeRoom mirrors this state for UI but doesn't fight it
- Non-GP charts (TEXT, PDF, IMAGE) only show metronome, not full playback controls
- The backing track player (existing in PracticeRoom) remains separate for non-GP charts

---

## Changelog

- 2025-11-27: Added acceptance criteria and test specifications for all phases
- 2025-11-27: Initial plan created
