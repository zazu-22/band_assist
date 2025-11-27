# Practice Room Unified Control Bar Refactor

## Metadata

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Authors** | AI Assistant |
| **Date** | 2025-11-27 |
| **Related Issues** | N/A |
| **Source Document** | `docs/ai_docs/practice-room-refactor-plan.md` |
| **Depends On** | `infra-alphatab-modernization.md` (Phases 1-2 recommended first) |

---

## 1. Overview

This specification details a comprehensive refactoring of the Practice Room module to unify all playback controls into a single control bar, reduce vertical space consumption, improve layout stability, and align with the established "Backstage Command Center" design system.

The refactor transforms AlphaTabRenderer from a self-contained component with its own UI into a pure renderer controllable via an imperative API, enabling the parent PracticeRoom component to provide unified controls for all chart types.

---

## 2. Background / Problem Statement

### Current Issues

The Practice Room currently suffers from four key problems:

**1. Excessive Vertical Space Consumption (~192px overhead)**
- Practice Room header: ~56px
- Chart selector row: ~48px
- AlphaTab toolbar: ~48px
- AlphaTab progress bar: ~40px

This leaves significantly less space for the actual music content, especially on laptop screens.

**2. Layout Instability**
When the song list panel collapses, chart selector tabs shift position, creating jarring visual movement that disrupts user focus. The toggle button stays anchored left while chart tabs jump from right to left.

**3. Visual Inconsistency**
AlphaTabRenderer uses a zinc/white color scheme instead of the app's amber/dark theme. It lacks:
- Brawler serif fonts for headers
- JetBrains Mono for numeric displays
- shadcn/ui Button components
- Proper TooltipProvider patterns

**4. Poor Responsive Behavior**
The AlphaTab toolbar overflows on narrow screens. BPM slider, metronome indicators, and track selector compete for space with no graceful mobile degradation.

### Root Cause Analysis

The current architecture treats AlphaTabRenderer as a standalone component with complete control over its own UI. This creates:
- Duplicate state management between PracticeRoom and AlphaTabRenderer
- Inconsistent styling (AlphaTabRenderer predates the design system)
- No coordination of controls across chart types
- Layout that's dependent on component rendering order

---

## 3. Goals

- **Reduce vertical overhead to ≤100px** (from ~192px)
- **Eliminate layout shift** when toggling song list visibility
- **Apply design system** patterns to all Practice Room controls
- **Enable responsive layouts** that work from 320px to desktop
- **Maintain full backwards compatibility** with existing AlphaTabRenderer usage
- **Improve code maintainability** through clear separation of concerns
- **Preserve all existing functionality** for non-GP chart types

---

## 4. Non-Goals

- Modifying AlphaTab library internals or forking the library
- Adding new playback features (loop regions, A/B practice) beyond what AlphaTab provides
- Changing the data model for songs, charts, or playback state
- Mobile app development or PWA features
- Real-time collaboration features
- Audio recording or backing track management
- Performance Mode changes (separate component)

---

## 5. Technical Dependencies

### External Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `@coderline/alphatab` | ^1.6.3 | Guitar Pro file rendering and playback |
| `react` | ^19.2.0 | Component framework |
| `lucide-react` | ^0.554.0 | Icon library |
| `tailwind-merge` | ^3.4.0 | Class merging utility |
| `class-variance-authority` | ^0.7.1 | Component variant management |

### Internal Dependencies

| Component/Module | Location | Purpose |
|------------------|----------|---------|
| Primitives | `@/components/primitives` | Button, Tooltip, Card, etc. |
| UI Components | `@/components/ui` | StatusBadge, EmptyState, ResizablePanel |
| Design System | `docs/design-system.md` | Typography, colors, animations |
| Types | `@/types.ts` | Song, SongChart interfaces |

### AlphaTab CDN Integration

AlphaTab is loaded from CDN in `index.html`:
```html
<script src="https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.min.js"></script>
```

The `@coderline/alphatab` npm package provides type definitions only.

---

## 6. Detailed Design

### 6.1 Architecture Change

#### Current Architecture

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

#### Proposed Architecture

```
┌─────────────────────────────────────────────────────────┐
│ PracticeControlBar (unified)                            │
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

### 6.2 New Type Definitions

#### AlphaTab Handle Interface

```typescript
// src/components/practice/types.ts

/**
 * Imperative handle for controlling AlphaTab playback from parent components.
 * Exposed via React.forwardRef and useImperativeHandle.
 */
export interface AlphaTabHandle {
  /** Start playback from current position */
  play(): void;
  /** Pause playback at current position */
  pause(): void;
  /** Stop playback and return to start */
  stop(): void;
  /** Seek to a percentage (0-1) of the total duration */
  seekTo(percentage: number): void;
  /** Set playback speed multiplier (0.25 to 2.0) */
  setPlaybackSpeed(speed: number): void;
  /** Enable or disable looping */
  setLoop(enabled: boolean): void;
  /** Set loop range in ticks, or null to clear */
  setLoopRange(range: { startTick: number; endTick: number } | null): void;
  /** Render a specific track by index */
  renderTrack(index: number): void;
  /** Toggle mute state for a track */
  toggleTrackMute(index: number): void;
  /** Toggle solo state for a track */
  toggleTrackSolo(index: number): void;
  // Volume controls (from infra-alphatab-modernization.md Phase 3)
  /** Set volume for a specific track (0-2, default 1.0) */
  setTrackVolume(index: number, volume: number): void;
  /** Set master volume (0-1, default 1.0) */
  setMasterVolume(volume: number): void;
  /** Set metronome volume (0-1, default 0) */
  setMetronomeVolume(volume: number): void;
}

/**
 * Current state of AlphaTab playback, emitted via onStateChange callback.
 */
export interface AlphaTabState {
  isPlaying: boolean;
  isLooping: boolean;
  currentSpeed: number;
  currentBPM: number;
  originalTempo: number;
  currentTrackIndex: number;
  metronomeBeat: number; // 0 = no beat, 1-4 = current beat
  // Volume state (from infra-alphatab-modernization.md Phase 3)
  masterVolume: number;
  metronomeVolume: number;
}

/**
 * Track information from loaded score.
 */
export interface TrackInfo {
  index: number;
  name: string;
  isMute: boolean;
  isSolo: boolean;
  volume: number; // 0-2, default 1.0 (from infra-alphatab-modernization.md Phase 3)
}
```

#### Updated AlphaTabRenderer Props

```typescript
/**
 * Props for AlphaTabRenderer component.
 * After refactor, showControls defaults to false.
 */
export interface AlphaTabRendererProps {
  /** Base64 Data URI of Guitar Pro file */
  fileData: string;
  /** If true, disables player functionality (for read-only display) */
  readOnly?: boolean;
  /** Show built-in toolbar controls (default: false after refactor) */
  showControls?: boolean;
  /** Show built-in progress bar (default: false after refactor) */
  showProgressBar?: boolean;
  /** Callback when player is ready with imperative handle */
  onReady?: (handle: AlphaTabHandle) => void;
  /** Callback when playback state changes */
  onStateChange?: (state: AlphaTabState) => void;
  /** Callback for position updates (throttled to ~10 FPS) */
  onPositionChange?: (current: number, total: number) => void;
  /** Callback when tracks are loaded from score */
  onTracksLoaded?: (tracks: TrackInfo[]) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;

  // Legacy props for backwards compatibility
  isPlaying?: boolean;
  onPlaybackChange?: (isPlaying: boolean) => void;
}
```

### 6.3 Component Structure

#### New File Organization

```
src/components/
├── practice/
│   ├── index.ts                    # Barrel export
│   ├── types.ts                    # Type definitions
│   ├── PracticeControlBar.tsx      # Main unified control bar
│   ├── PracticeControlBar.test.tsx
│   ├── PlaybackControls.tsx        # Play/Pause/Stop/Loop buttons
│   ├── PlaybackControls.test.tsx
│   ├── ChartTabs.tsx               # Chart type selector tabs
│   ├── ChartTabs.test.tsx
│   ├── TrackSelector.tsx           # Track dropdown for GP files
│   ├── TrackSelector.test.tsx
│   ├── TempoControl.tsx            # BPM slider and display
│   ├── TempoControl.test.tsx
│   ├── MetronomeIndicator.tsx      # Visual beat indicator
│   ├── MetronomeIndicator.test.tsx
│   ├── ProgressBar.tsx             # Playback position bar
│   └── ProgressBar.test.tsx
├── PracticeRoom.tsx                # Refactored main component
└── AlphaTabRenderer.tsx            # Simplified renderer
```

### 6.4 PracticeControlBar Component Design

```typescript
// src/components/practice/PracticeControlBar.tsx

interface PracticeControlBarProps {
  // Song info
  song: Song | null;

  // Song list toggle
  showSongList: boolean;
  onToggleSongList: () => void;

  // Chart selection
  charts: SongChart[];
  activeChartId: string | null;
  onSelectChart: (id: string) => void;

  // Playback state (for GP charts)
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

  // Playback controls (for GP charts)
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onSeek?: (percentage: number) => void;
  onToggleLoop?: () => void;
  onSetBPM?: (bpm: number) => void;

  // Track controls (for GP charts)
  tracks?: TrackInfo[];
  currentTrackIndex?: number;
  onSelectTrack?: (index: number) => void;
  onToggleTrackMute?: (index: number) => void;
  onToggleTrackSolo?: (index: number) => void;
  onSetTrackVolume?: (index: number, volume: number) => void; // From infra spec Phase 3

  // Volume controls (for GP charts) - from infra-alphatab-modernization.md Phase 3
  volumeState?: {
    masterVolume: number;
    metronomeVolume: number;
  };
  onSetMasterVolume?: (volume: number) => void;
  onSetMetronomeVolume?: (volume: number) => void;

  // Non-GP controls
  metronomeState?: {
    bpm: number;
    isActive: boolean;
  };
  onMetronomeBpmChange?: (bpm: number) => void;
  onMetronomeToggle?: () => void;
}
```

#### Layout Structure

```tsx
<header className="border-b border-border bg-card shrink-0">
  {/* Main control row - max height ~56px */}
  <div className="flex items-center gap-4 px-4 py-2">
    {/* Left: Toggle + Song info */}
    <div className="flex items-center gap-3 min-w-0 shrink-0">
      <ToggleButton />
      <SongInfo /> {/* title + BPM/key */}
    </div>

    {/* Center: Playback + Charts - flex-1, centered */}
    <div className="flex-1 flex items-center justify-center gap-4">
      {isGuitarPro && <PlaybackControls />}
      <ChartTabs /> {/* Stable position regardless of song list */}
    </div>

    {/* Right: Track/BPM/Metronome */}
    <div className="flex items-center gap-3 shrink-0">
      {isGuitarPro ? (
        <>
          <TrackSelector />
          <TempoControl />
          <MetronomeIndicator />
        </>
      ) : (
        <MetronomeControls />
      )}
    </div>
  </div>

  {/* Progress bar row - only for GP, ~40px */}
  {isGuitarPro && playbackState && (
    <ProgressBar />
  )}
</header>
```

### 6.5 State Management in PracticeRoom

```typescript
// src/components/PracticeRoom.tsx (refactored)

const PracticeRoom: React.FC<PracticeRoomProps> = ({ songs }) => {
  // Existing state
  const [selectedSongId, setSelectedSongId] = useState<string | null>(...);
  const [activeChartId, setActiveChartId] = useState<string | null>(null);
  const [showSongList, setShowSongList] = useState(!isMobile);

  // NEW: AlphaTab control state
  const alphaTabRef = useRef<AlphaTabHandle | null>(null);
  const [gpState, setGpState] = useState<AlphaTabState | null>(null);
  const [gpTracks, setGpTracks] = useState<TrackInfo[]>([]);
  const [gpPosition, setGpPosition] = useState({ current: 0, total: 0 });

  // Existing metronome state (for non-GP charts)
  const [metronomeBpm, setMetronomeBpm] = useState(120);
  const [metronomeActive, setMetronomeActive] = useState(false);

  // Callbacks for PracticeControlBar
  const handlePlay = useCallback(() => alphaTabRef.current?.play(), []);
  const handlePause = useCallback(() => alphaTabRef.current?.pause(), []);
  const handleStop = useCallback(() => alphaTabRef.current?.stop(), []);
  const handleSeek = useCallback((pct: number) => alphaTabRef.current?.seekTo(pct), []);
  const handleToggleLoop = useCallback(() => {
    if (alphaTabRef.current && gpState) {
      alphaTabRef.current.setLoop(!gpState.isLooping);
    }
  }, [gpState]);
  const handleSetBPM = useCallback((bpm: number) => {
    if (alphaTabRef.current && gpState) {
      const speed = bpm / gpState.originalTempo;
      alphaTabRef.current.setPlaybackSpeed(speed);
    }
  }, [gpState]);

  // AlphaTab callbacks
  const handleAlphaTabReady = useCallback((handle: AlphaTabHandle) => {
    alphaTabRef.current = handle;
  }, []);

  const handleStateChange = useCallback((state: AlphaTabState) => {
    setGpState(state);
  }, []);

  const handlePositionChange = useCallback((current: number, total: number) => {
    setGpPosition({ current, total });
  }, []);

  const handleTracksLoaded = useCallback((tracks: TrackInfo[]) => {
    setGpTracks(tracks);
  }, []);

  // Render
  return (
    <div className="h-full flex flex-col">
      <PracticeControlBar
        song={selectedSong}
        showSongList={showSongList}
        onToggleSongList={toggleSongList}
        charts={selectedSong?.charts ?? []}
        activeChartId={activeChartId}
        onSelectChart={setActiveChartId}
        isGuitarPro={activeChart?.type === 'GP'}
        playbackState={gpState ? {
          isPlaying: gpState.isPlaying,
          isLooping: gpState.isLooping,
          currentTime: gpPosition.current,
          totalTime: gpPosition.total,
          currentBPM: gpState.currentBPM,
          originalTempo: gpState.originalTempo,
          metronomeBeat: gpState.metronomeBeat,
        } : undefined}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onSeek={handleSeek}
        onToggleLoop={handleToggleLoop}
        onSetBPM={handleSetBPM}
        tracks={gpTracks}
        currentTrackIndex={gpState?.currentTrackIndex}
        onSelectTrack={(i) => alphaTabRef.current?.renderTrack(i)}
        onToggleTrackMute={(i) => alphaTabRef.current?.toggleTrackMute(i)}
        onToggleTrackSolo={(i) => alphaTabRef.current?.toggleTrackSolo(i)}
        metronomeState={{ bpm: metronomeBpm, isActive: metronomeActive }}
        onMetronomeBpmChange={setMetronomeBpm}
        onMetronomeToggle={toggleMetronome}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Song list panel */}
        {showSongList && <SongListPanel ... />}

        {/* Content area */}
        <div className="flex-1 flex flex-col">
          {activeChart?.type === 'GP' ? (
            <AlphaTabRenderer
              fileData={activeChart.storageBase64 || activeChart.url!}
              showControls={false}
              showProgressBar={false}
              onReady={handleAlphaTabReady}
              onStateChange={handleStateChange}
              onPositionChange={handlePositionChange}
              onTracksLoaded={handleTracksLoaded}
            />
          ) : (
            /* Other chart types + backing track player */
          )}
        </div>
      </div>
    </div>
  );
};
```

### 6.6 AlphaTabRenderer Modifications

Key changes to `AlphaTabRenderer.tsx`:

1. **Add `useImperativeHandle`** to expose control methods
2. **Add new callback props** (`onReady`, `onStateChange`, etc.)
3. **Add `showControls` and `showProgressBar` props** (default: `false`)
4. **Maintain backwards compatibility** via legacy props
5. **Remove internal styling** that conflicts with design system when controls hidden

```typescript
// Pseudocode for key changes

export const AlphaTabRenderer = forwardRef<AlphaTabHandle, AlphaTabRendererProps>(
  (props, ref) => {
    const {
      fileData,
      readOnly = false,
      showControls = false,  // NEW: default false
      showProgressBar = false, // NEW: default false
      onReady,
      onStateChange,
      onPositionChange,
      onTracksLoaded,
      onError,
      // Legacy props
      isPlaying: externalIsPlaying,
      onPlaybackChange,
    } = props;

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
      play: () => apiRef.current?.play(),
      pause: () => apiRef.current?.pause(),
      stop: () => { /* existing stop logic */ },
      seekTo: (pct) => { /* existing seek logic */ },
      setPlaybackSpeed: (speed) => { /* existing speed logic */ },
      setLoop: (enabled) => { apiRef.current && (apiRef.current.isLooping = enabled) },
      setLoopRange: (range) => { apiRef.current && (apiRef.current.playbackRange = range) },
      renderTrack: (idx) => { /* existing render logic */ },
      toggleTrackMute: (idx) => { /* existing mute logic */ },
      toggleTrackSolo: (idx) => { /* existing solo logic */ },
    }), [/* deps */]);

    // Call onReady when player is ready
    useEffect(() => {
      if (playerReady && onReady) {
        onReady({
          play: () => apiRef.current?.play(),
          // ... all handle methods
        });
      }
    }, [playerReady, onReady]);

    // Emit state changes
    useEffect(() => {
      if (onStateChange) {
        onStateChange({
          isPlaying: internalIsPlaying,
          isLooping,
          currentSpeed,
          currentBPM: currentBPM ?? originalTempo ?? 120,
          originalTempo: originalTempo ?? 120,
          currentTrackIndex: currentTrackIndex ?? 0,
          metronomeBeat,
        });
      }
    }, [internalIsPlaying, isLooping, currentSpeed, currentBPM, metronomeBeat, currentTrackIndex]);

    // Emit position changes
    useEffect(() => {
      if (onPositionChange) {
        onPositionChange(currentTime, totalTime);
      }
    }, [currentTime, totalTime, onPositionChange]);

    // Emit tracks
    useEffect(() => {
      if (onTracksLoaded && tracks.length > 0) {
        onTracksLoaded(tracks.map((t, i) => ({
          index: i,
          name: t.name,
          isMute: t.playbackInfo.isMute,
          isSolo: t.playbackInfo.isSolo,
        })));
      }
    }, [tracks, onTracksLoaded]);

    return (
      <div className="flex flex-col h-full">
        {/* Toolbar - only if showControls */}
        {showControls && <Toolbar ... />}

        {/* Progress Bar - only if showProgressBar */}
        {showProgressBar && totalTime > 0 && <ProgressBarUI ... />}

        {/* Score render area - always shown */}
        <div ref={rootRef} className="flex-1 overflow-auto bg-white">
          {loading && <LoadingState />}
          {error && <ErrorState onRetry={() => setRetryKey(k => k + 1)} />}
          <div ref={containerRef} />
        </div>
      </div>
    );
  }
);
```

---

## 7. User Experience

### 7.1 User Flow (Guitar Pro Chart)

1. User navigates to Practice Room
2. Song list shows on left (desktop) or in drawer (mobile)
3. User selects a song with GP chart
4. **Unified control bar** displays:
   - Toggle button for song list (left)
   - Song title, BPM, key (left-center)
   - Play/Pause/Stop/Loop buttons (center)
   - Chart type tabs (center-right)
   - Track selector dropdown (right)
   - BPM slider with reset button (right)
   - Metronome beat indicators (right)
5. Progress bar appears below control bar
6. AlphaTab renders score in content area (toolbar hidden)
7. All playback controls in unified bar control AlphaTab

### 7.2 User Flow (Text/PDF/Image Chart)

1. User selects a song with TEXT/PDF/IMAGE chart
2. **Unified control bar** displays:
   - Toggle button for song list
   - Song title, BPM, key
   - Chart type tabs
   - Metronome on/off toggle with BPM slider
3. No progress bar (no playback)
4. Chart content renders in content area
5. Backing track player (existing) appears at bottom if song has backing track

### 7.3 Layout Stability

The key UX improvement is that **chart tabs remain in a stable position** regardless of song list state:

```
Song List VISIBLE:
[☰] "Hotel California" 120BPM | [▶][■]  [GP][TEXT][PDF]  Track: Guitar ♩=120

Song List HIDDEN:
[☰] "Hotel California" 120BPM | [▶][■]  [GP][TEXT][PDF]  Track: Guitar ♩=120
     ^--- Only this area shifts
```

The center-justified layout ensures chart tabs don't move when the left column toggles.

---

## 8. Testing Strategy

### 8.1 Unit Tests

#### AlphaTabRenderer API Extraction Tests

```typescript
// src/components/AlphaTabRenderer.test.tsx (additions)

describe('AlphaTabRenderer API Extraction', () => {
  describe('imperative handle', () => {
    it('calls onReady with handle when player is ready', async () => {
      const onReady = vi.fn();
      render(<AlphaTabRenderer fileData={mockFileData} onReady={onReady} />);

      // Trigger playerReady
      act(() => { playerReadyHandler(); });

      await waitFor(() => {
        expect(onReady).toHaveBeenCalledWith(expect.objectContaining({
          play: expect.any(Function),
          pause: expect.any(Function),
          stop: expect.any(Function),
          seekTo: expect.any(Function),
          setPlaybackSpeed: expect.any(Function),
          setLoop: expect.any(Function),
          setLoopRange: expect.any(Function),
          renderTrack: expect.any(Function),
          toggleTrackMute: expect.any(Function),
          toggleTrackSolo: expect.any(Function),
        }));
      });
    });

    it('handle.play() triggers AlphaTab play', async () => {
      let capturedHandle: AlphaTabHandle | null = null;
      const onReady = (h: AlphaTabHandle) => { capturedHandle = h; };

      render(<AlphaTabRenderer fileData={mockFileData} onReady={onReady} />);
      act(() => { playerReadyHandler(); });

      await waitFor(() => { expect(capturedHandle).not.toBeNull(); });

      act(() => { capturedHandle!.play(); });
      expect(mockApiInstance.play).toHaveBeenCalled();
    });

    // Similar tests for pause, stop, seekTo, setPlaybackSpeed, etc.
  });

  describe('callbacks', () => {
    it('onStateChange fires when playback starts', async () => {
      const onStateChange = vi.fn();
      render(<AlphaTabRenderer fileData={mockFileData} onStateChange={onStateChange} />);

      act(() => { stateHandler({ state: 1 }); });

      await waitFor(() => {
        expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({
          isPlaying: true,
        }));
      });
    });

    it('onPositionChange fires during playback (throttled)', async () => {
      const onPositionChange = vi.fn();
      render(<AlphaTabRenderer fileData={mockFileData} onPositionChange={onPositionChange} />);

      act(() => { positionHandler({ currentTime: 1000, endTime: 5000 }); });

      await waitFor(() => {
        expect(onPositionChange).toHaveBeenCalledWith(1000, 5000);
      });
    });

    it('onTracksLoaded fires with track array on score load', async () => {
      const onTracksLoaded = vi.fn();
      render(<AlphaTabRenderer fileData={mockFileData} onTracksLoaded={onTracksLoaded} />);

      act(() => { scoreLoadedHandler({ tracks: mockTracks, tempo: 120 }); });

      await waitFor(() => {
        expect(onTracksLoaded).toHaveBeenCalledWith([
          { index: 0, name: 'Guitar', isMute: false, isSolo: false },
          { index: 1, name: 'Bass', isMute: false, isSolo: false },
        ]);
      });
    });

    it('onError fires when file fails to load', async () => {
      const onError = vi.fn();
      render(<AlphaTabRenderer fileData={mockFileData} onError={onError} />);

      act(() => { errorHandler({ message: 'Test error' }); });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.stringContaining('Test error'));
      });
    });
  });

  describe('showControls prop', () => {
    it('renders toolbar when showControls={true}', () => {
      render(<AlphaTabRenderer fileData={mockFileData} showControls={true} />);
      expect(screen.getByTitle('Play')).toBeInTheDocument();
    });

    it('hides toolbar when showControls={false}', () => {
      render(<AlphaTabRenderer fileData={mockFileData} showControls={false} />);
      expect(screen.queryByTitle('Play')).not.toBeInTheDocument();
    });

    it('defaults to showControls={false}', () => {
      render(<AlphaTabRenderer fileData={mockFileData} />);
      expect(screen.queryByTitle('Play')).not.toBeInTheDocument();
    });
  });
});
```

#### PracticeControlBar Tests

```typescript
// src/components/practice/PracticeControlBar.test.tsx

describe('PracticeControlBar', () => {
  const defaultProps = {
    song: mockSong,
    showSongList: true,
    onToggleSongList: vi.fn(),
    charts: mockCharts,
    activeChartId: 'chart-1',
    onSelectChart: vi.fn(),
    isGuitarPro: true,
  };

  describe('song info', () => {
    it('displays song title with font-serif class', () => {
      render(<PracticeControlBar {...defaultProps} />);
      const title = screen.getByText(mockSong.title);
      expect(title).toHaveClass('font-serif');
    });

    it('displays BPM with font-mono tabular-nums classes', () => {
      render(<PracticeControlBar {...defaultProps} />);
      const bpm = screen.getByText(/120 BPM/);
      expect(bpm).toHaveClass('font-mono', 'tabular-nums');
    });

    it('shows placeholder when no song selected', () => {
      render(<PracticeControlBar {...defaultProps} song={null} />);
      expect(screen.getByText('Select a Song')).toBeInTheDocument();
    });
  });

  describe('song list toggle', () => {
    it('renders toggle button', () => {
      render(<PracticeControlBar {...defaultProps} />);
      expect(screen.getByLabelText(/song list/i)).toBeInTheDocument();
    });

    it('calls onToggleSongList when clicked', () => {
      render(<PracticeControlBar {...defaultProps} />);
      fireEvent.click(screen.getByLabelText(/song list/i));
      expect(defaultProps.onToggleSongList).toHaveBeenCalled();
    });

    it('shows PanelLeftClose icon when list is visible', () => {
      render(<PracticeControlBar {...defaultProps} showSongList={true} />);
      expect(screen.getByLabelText('Hide song list')).toBeInTheDocument();
    });

    it('shows PanelLeftOpen icon when list is hidden', () => {
      render(<PracticeControlBar {...defaultProps} showSongList={false} />);
      expect(screen.getByLabelText('Show song list')).toBeInTheDocument();
    });
  });

  describe('chart tabs', () => {
    it('renders tab for each chart', () => {
      render(<PracticeControlBar {...defaultProps} />);
      mockCharts.forEach(chart => {
        expect(screen.getByText(chart.name)).toBeInTheDocument();
      });
    });

    it('shows correct icon per chart type', () => {
      render(<PracticeControlBar {...defaultProps} />);
      // GP charts should have Guitar icon, TEXT should have Music2, etc.
      expect(screen.getByTestId('chart-icon-GP')).toBeInTheDocument();
    });

    it('highlights active chart', () => {
      render(<PracticeControlBar {...defaultProps} activeChartId="chart-1" />);
      const activeTab = screen.getByRole('tab', { selected: true });
      expect(activeTab).toHaveClass('bg-primary/20');
    });

    it('calls onSelectChart when tab clicked', () => {
      render(<PracticeControlBar {...defaultProps} />);
      fireEvent.click(screen.getByText('Lead Sheet'));
      expect(defaultProps.onSelectChart).toHaveBeenCalledWith('chart-2');
    });
  });

  describe('playback controls (GP mode)', () => {
    const gpProps = {
      ...defaultProps,
      isGuitarPro: true,
      playbackState: {
        isPlaying: false,
        isLooping: false,
        currentTime: 0,
        totalTime: 180000,
        currentBPM: 120,
        originalTempo: 120,
        metronomeBeat: 0,
      },
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onStop: vi.fn(),
      onToggleLoop: vi.fn(),
    };

    it('renders play/pause/stop/loop buttons when isGuitarPro=true', () => {
      render(<PracticeControlBar {...gpProps} />);
      expect(screen.getByLabelText('Play')).toBeInTheDocument();
      expect(screen.getByLabelText('Stop')).toBeInTheDocument();
      expect(screen.getByLabelText('Toggle loop')).toBeInTheDocument();
    });

    it('hides playback controls when isGuitarPro=false', () => {
      render(<PracticeControlBar {...defaultProps} isGuitarPro={false} />);
      expect(screen.queryByLabelText('Play')).not.toBeInTheDocument();
    });

    it('shows pause icon when playing', () => {
      render(<PracticeControlBar {...gpProps} playbackState={{ ...gpProps.playbackState!, isPlaying: true }} />);
      expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    });

    it('calls onPlay when play clicked', () => {
      render(<PracticeControlBar {...gpProps} />);
      fireEvent.click(screen.getByLabelText('Play'));
      expect(gpProps.onPlay).toHaveBeenCalled();
    });

    it('calls onToggleLoop when loop clicked', () => {
      render(<PracticeControlBar {...gpProps} />);
      fireEvent.click(screen.getByLabelText('Toggle loop'));
      expect(gpProps.onToggleLoop).toHaveBeenCalled();
    });

    it('highlights loop button when looping', () => {
      render(<PracticeControlBar {...gpProps} playbackState={{ ...gpProps.playbackState!, isLooping: true }} />);
      expect(screen.getByLabelText('Toggle loop')).toHaveClass('bg-primary');
    });
  });

  describe('progress bar', () => {
    const gpProps = {
      ...defaultProps,
      isGuitarPro: true,
      playbackState: {
        isPlaying: false,
        isLooping: false,
        currentTime: 60000,
        totalTime: 180000,
        currentBPM: 120,
        originalTempo: 120,
        metronomeBeat: 0,
      },
      onSeek: vi.fn(),
    };

    it('renders when playbackState provided', () => {
      render(<PracticeControlBar {...gpProps} />);
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('shows current time formatted as m:ss', () => {
      render(<PracticeControlBar {...gpProps} />);
      expect(screen.getByText('1:00')).toBeInTheDocument();
    });

    it('shows total time formatted as m:ss', () => {
      render(<PracticeControlBar {...gpProps} />);
      expect(screen.getByText('3:00')).toBeInTheDocument();
    });

    it('clicking bar calls onSeek with percentage', () => {
      render(<PracticeControlBar {...gpProps} />);
      const progressBar = screen.getByTestId('progress-bar');

      // Simulate click at 50%
      fireEvent.click(progressBar, {
        clientX: 100,
        currentTarget: { getBoundingClientRect: () => ({ left: 0, width: 200 }) },
      });

      expect(gpProps.onSeek).toHaveBeenCalledWith(0.5);
    });
  });

  describe('layout stability', () => {
    it('chart tabs do not shift when song list toggles', () => {
      const { rerender } = render(<PracticeControlBar {...defaultProps} showSongList={true} />);
      const tabsWithList = screen.getByTestId('chart-tabs');
      const rectWithList = tabsWithList.getBoundingClientRect();

      rerender(<PracticeControlBar {...defaultProps} showSongList={false} />);
      const tabsWithoutList = screen.getByTestId('chart-tabs');
      const rectWithoutList = tabsWithoutList.getBoundingClientRect();

      // Tabs should be centered regardless of song list state
      expect(rectWithList.left).toBeCloseTo(rectWithoutList.left, 5);
    });
  });
});
```

### 8.2 Integration Tests

```typescript
// src/components/PracticeRoom.test.tsx (additions)

describe('PracticeRoom Integration', () => {
  describe('control bar integration', () => {
    it('renders PracticeControlBar', () => {
      render(<PracticeRoom songs={mockSongs} />);
      expect(screen.getByTestId('practice-control-bar')).toBeInTheDocument();
    });

    it('does not render old header elements', () => {
      render(<PracticeRoom songs={mockSongs} />);
      // Old header had separate metronome section in header
      expect(screen.queryByTestId('legacy-header')).not.toBeInTheDocument();
    });

    it('does not render separate chart selector row', () => {
      render(<PracticeRoom songs={mockSongs} />);
      // Old chart selector was in a separate div below header
      expect(screen.queryByTestId('legacy-chart-selector')).not.toBeInTheDocument();
    });
  });

  describe('AlphaTab control', () => {
    it('renders AlphaTabRenderer with showControls=false for GP charts', async () => {
      render(<PracticeRoom songs={songsWithGP} />);

      // Select GP chart
      fireEvent.click(screen.getByText('Guitar Tab'));

      await waitFor(() => {
        // AlphaTab's internal toolbar should not be visible
        expect(screen.queryByTestId('alphatab-toolbar')).not.toBeInTheDocument();
      });
    });

    it('play button triggers AlphaTab playback', async () => {
      render(<PracticeRoom songs={songsWithGP} />);
      fireEvent.click(screen.getByText('Guitar Tab'));

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Play'));
        expect(mockAlphaTabHandle.play).toHaveBeenCalled();
      });
    });
  });

  describe('backwards compatibility', () => {
    it('metronome works for non-GP charts', async () => {
      render(<PracticeRoom songs={songsWithText} />);
      fireEvent.click(screen.getByText('Chord Chart'));

      const metronomeToggle = screen.getByLabelText(/metronome/i);
      fireEvent.click(metronomeToggle);

      // Verify metronome is active (would hear audio in real test)
      expect(screen.getByLabelText(/stop metronome/i)).toBeInTheDocument();
    });

    it('backing track player works for non-GP charts', async () => {
      render(<PracticeRoom songs={songsWithBackingTrack} />);

      // Backing track player should appear at bottom
      expect(screen.getByTestId('backing-track-player')).toBeInTheDocument();
    });
  });
});
```

### 8.3 Accessibility Tests

```typescript
// src/components/practice/accessibility.test.tsx

describe('Practice Room Accessibility', () => {
  it('passes axe-core audit', async () => {
    const { container } = render(<PracticeRoom songs={mockSongs} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  describe('keyboard navigation', () => {
    it('Tab navigates through all controls', () => {
      render(<PracticeControlBar {...defaultProps} />);

      const focusableElements = [
        'toggle-button',
        'play-button',
        'stop-button',
        'loop-button',
        'chart-tab-1',
        'chart-tab-2',
        'track-selector',
        'bpm-slider',
      ];

      focusableElements.forEach((id, index) => {
        if (index > 0) userEvent.tab();
        expect(screen.getByTestId(id)).toHaveFocus();
      });
    });

    it('Space toggles play/pause when play button focused', () => {
      render(<PracticeControlBar {...gpProps} />);
      screen.getByLabelText('Play').focus();
      userEvent.keyboard(' ');
      expect(gpProps.onPlay).toHaveBeenCalled();
    });

    it('Escape closes open dropdowns', () => {
      render(<PracticeControlBar {...gpProps} />);
      fireEvent.click(screen.getByTestId('track-selector'));
      expect(screen.getByTestId('track-dropdown')).toBeInTheDocument();

      userEvent.keyboard('{Escape}');
      expect(screen.queryByTestId('track-dropdown')).not.toBeInTheDocument();
    });
  });

  describe('ARIA labels', () => {
    it('all buttons have aria-label', () => {
      render(<PracticeControlBar {...gpProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });

  describe('reduced motion', () => {
    it('respects prefers-reduced-motion', () => {
      // Mock matchMedia
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      render(<PracticeControlBar {...gpProps} />);

      const animatedElements = screen.getAllByTestId(/animated/);
      animatedElements.forEach(el => {
        expect(el).toHaveClass('motion-reduce:transition-none');
      });
    });
  });
});
```

### 8.4 Visual Regression Tests

Visual tests should be run using Storybook + Chromatic or similar:

- Control bar at various viewport widths (320px, 768px, 1024px, 1440px)
- Control bar with/without song list visible
- Control bar in playing/paused/stopped states
- Chart tabs with 1, 3, 5 charts
- Error states
- Loading states

---

## 9. Performance Considerations

### 9.1 Rendering Optimizations

- **Memoize callbacks** with `useCallback` to prevent child re-renders
- **Memoize derived state** with `useMemo` (formatted times, percentages)
- **Throttle position updates** to 100ms (~10 FPS)
- **Use `React.memo`** for pure presentational sub-components
- **Avoid inline object/array literals** in props

### 9.2 Bundle Size

No new dependencies. New components will add ~5-10KB gzipped.

### 9.3 Memory

- Clear AlphaTab handle ref on chart switch/unmount
- Clear metronome intervals on component unmount
- Use `useRef` for mutable values that don't need re-renders

---

## 10. Security Considerations

- No new API endpoints or data persistence
- No user-generated content handling beyond existing chart data
- AlphaTab file parsing happens client-side; malicious files could cause DoS but not data breach
- Existing input validation for file uploads (10MB limit, type checking) remains

---

## 11. Documentation

### Files to Create

1. `src/components/practice/README.md` - Component usage guide
2. JSDoc comments on all exported types and components

### Files to Update

1. `CLAUDE.md` - Add practice components to architecture overview
2. `docs/design-system.md` - Reference PracticeControlBar as implementation example

---

## 12. Implementation Phases

### Phase 1: AlphaTab API Extraction

**Scope:**
- Add `AlphaTabHandle` interface
- Implement `useImperativeHandle` in AlphaTabRenderer
- Add callback props (`onReady`, `onStateChange`, `onPositionChange`, `onTracksLoaded`, `onError`)
- Add `showControls` and `showProgressBar` props with backwards-compatible defaults
- Write comprehensive tests

**Files Modified:**
- `src/components/AlphaTabRenderer.tsx`
- `src/components/AlphaTabRenderer.test.tsx`

**Files Created:**
- `src/components/practice/types.ts`

**Acceptance Criteria:**
- [ ] `AlphaTabHandle` interface exported with all 10 methods documented
- [ ] `onReady` fires with functional handle when player initializes
- [ ] All handle methods correctly invoke AlphaTab API
- [ ] `onStateChange` fires on every playback state change
- [ ] `onPositionChange` fires with throttled position updates
- [ ] `onTracksLoaded` fires with track array when score loads
- [ ] `showControls={true}` renders existing toolbar (backwards compat)
- [ ] `showControls={false}` renders only score area
- [ ] All existing AlphaTabRenderer tests pass
- [ ] No TypeScript errors

### Phase 2: Unified Control Bar Component

**Scope:**
- Create `PracticeControlBar` and sub-components
- Implement all layout sections
- Apply design system patterns

**Files Created:**
- `src/components/practice/index.ts`
- `src/components/practice/PracticeControlBar.tsx`
- `src/components/practice/PlaybackControls.tsx`
- `src/components/practice/ChartTabs.tsx`
- `src/components/practice/TrackSelector.tsx`
- `src/components/practice/TempoControl.tsx`
- `src/components/practice/MetronomeIndicator.tsx`
- `src/components/practice/ProgressBar.tsx`
- All corresponding test files

**Acceptance Criteria:**
- [ ] PracticeControlBar renders all sections (left/center/right)
- [ ] Song list toggle shows correct icon state
- [ ] Song title uses `font-serif`, BPM uses `font-mono tabular-nums`
- [ ] Chart tabs render with correct icons for each type
- [ ] Playback controls render for GP charts only
- [ ] Track selector dropdown shows all tracks
- [ ] BPM slider adjusts tempo within valid range
- [ ] Metronome indicator shows beat pulses
- [ ] Progress bar shows current/total time and allows seeking
- [ ] All controls have proper ARIA labels

### Phase 3: PracticeRoom Integration

**Scope:**
- Replace old header with PracticeControlBar
- Lift AlphaTab state to PracticeRoom
- Wire control bar callbacks to AlphaTab handle
- Remove duplicate UI code

**Files Modified:**
- `src/components/PracticeRoom.tsx`

**Acceptance Criteria:**
- [ ] PracticeControlBar replaces old header
- [ ] Old chart selector row removed
- [ ] AlphaTabRenderer uses `showControls={false}`
- [ ] AlphaTab handle captured via `onReady`
- [ ] Playback state syncs from AlphaTab to control bar
- [ ] Control bar callbacks invoke AlphaTab methods
- [ ] Chart switching works for all types
- [ ] Non-GP charts show metronome and backing track player
- [ ] Song list toggle works
- [ ] Total toolbar height ≤ 100px

### Phase 4: Design System Alignment

**Scope:**
- Apply typography patterns (Brawler, JetBrains Mono)
- Use shadcn/ui Button, Tooltip, DropdownMenu
- Implement status colors and animations
- Add focus states and transitions

**Files Modified:**
- All Phase 2 components
- `src/components/AlphaTabRenderer.tsx` (loading/error states)

**Acceptance Criteria:**
- [ ] Song title uses `font-serif`
- [ ] BPM/time displays use `font-mono tabular-nums`
- [ ] All buttons use shadcn/ui Button
- [ ] All icon buttons have Tooltip
- [ ] Active states use `--primary` color
- [ ] Progress bar uses `--primary` fill
- [ ] All animations respect `motion-reduce`
- [ ] Visual comparison passes design review

### Phase 5: Responsive Behavior

**Scope:**
- Implement breakpoint-specific layouts
- Add mobile overflow menu
- Ensure 320px minimum width works

**Files Modified:**
- All Phase 2 components
- `src/components/PracticeRoom.tsx`

**Files Created (if needed):**
- `src/components/practice/MobileControlSheet.tsx`

**Acceptance Criteria:**
- [ ] Desktop (≥1024px): Full labels visible
- [ ] Tablet (768-1023px): Icon buttons with tooltips
- [ ] Mobile (<768px): Overflow menu for secondary controls
- [ ] No horizontal overflow at 320px
- [ ] Touch targets ≥ 44px

### Phase 6: Testing & Polish

**Scope:**
- Ensure test coverage ≥ 80%
- Add keyboard navigation
- Add loading/error transitions
- Fix any accessibility issues

**Files Modified:**
- All test files
- Component files as needed for polish

**Acceptance Criteria:**
- [ ] All Phase 1-5 tests pass
- [ ] Test coverage ≥ 80% for new components
- [ ] No console errors during normal usage
- [ ] Loading state displays while AlphaTab initializes
- [ ] Space bar toggles play/pause
- [ ] Tab navigation works
- [ ] Screen reader can operate all controls
- [ ] TypeScript strict mode passes
- [ ] ESLint passes
- [ ] Build succeeds

---

## 13. Open Questions

1. **Mobile Sheet vs Overflow Menu**: Should secondary controls (BPM, track selector) go in a bottom sheet or dropdown overflow menu on mobile?
   - *Recommendation*: Start with dropdown, iterate based on user feedback

2. **Progress Bar Position**: Should progress bar be integrated into the main control row or remain as a separate row?
   - *Recommendation*: Separate row for click accuracy, but could revisit

3. **AlphaTab Version**: Current version is 1.6.3. Should we pin to this version or allow updates?
   - *Recommendation*: Pin to ~1.6.3 to avoid breaking changes

4. **Keyboard Shortcuts**: Should we add global shortcuts (Space = play/pause) or keep them scoped to focused elements?
   - *Recommendation*: Scoped to control bar focus to avoid conflicts with text editing

5. **Volume Controls in Mixer**: Should the TrackSelector include per-track volume sliders, or just mute/solo?
   - *Recommendation*: Include volume sliders - addresses real user complaints about track imbalance
   - *Dependency*: Requires `infra-alphatab-modernization.md` Phase 3

---

## 14. References

### Internal Documentation

- [Design System Guide](../docs/design-system.md)
- [CLAUDE.md Project Overview](../CLAUDE.md)
- [Practice Room Plan](../docs/ai_docs/practice-room-refactor-plan.md)
- [AlphaTab Infrastructure Spec](./infra-alphatab-modernization.md) - Dependency for ESM imports and volume controls

### External Documentation

- [AlphaTab API Reference](https://www.alphatab.net/docs/reference/api/)
- [React useImperativeHandle](https://react.dev/reference/react/useImperativeHandle)
- [shadcn/ui Components](https://ui.shadcn.com/)

### Related Files

- `src/components/PracticeRoom.tsx` - Current implementation
- `src/components/AlphaTabRenderer.tsx` - Current AlphaTab wrapper
- `src/components/AlphaTabRenderer.test.tsx` - Existing test patterns

---

## 15. Success Criteria Summary

| Metric | Target | Current |
|--------|--------|---------|
| Vertical overhead | ≤100px | ~192px |
| Layout shift on toggle | 0px | Variable |
| Design system compliance | 100% | ~40% |
| Minimum viewport width | 320px | Overflows |
| Test coverage (new code) | ≥80% | N/A |
| Accessibility violations | 0 | Unknown |

---

*Document version: 1.1*
*Last updated: 2025-11-27*
*Changes: Added dependency on infra-alphatab-modernization.md, added volume control interfaces*
