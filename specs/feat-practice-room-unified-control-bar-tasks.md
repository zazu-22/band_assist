# Task Breakdown: Practice Room Unified Control Bar Refactor

Generated: 2025-11-27
Source: `specs/feat-practice-room-unified-control-bar.md`

## Overview

This task breakdown decomposes the Practice Room Unified Control Bar specification into actionable implementation tasks. The refactoring transforms AlphaTabRenderer from a self-contained component into a pure renderer controllable via an imperative API, enabling the parent PracticeRoom component to provide unified controls for all chart types.

**Key Goals:**
- Reduce vertical overhead from ~192px to ≤100px
- Eliminate layout shift when toggling song list
- Apply design system patterns consistently
- Enable responsive layouts from 320px to desktop
- Maintain backwards compatibility

---

## Phase 1: AlphaTab API Extraction

**Objective**: Transform AlphaTabRenderer to expose imperative control methods via a handle, enabling external control of playback.

### Task 1.1: Create Practice Types Module

**Description**: Create type definitions for the AlphaTab imperative handle and state interfaces
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: None (foundation task)

**Technical Requirements**:
- Create new file: `src/components/practice/types.ts`
- Define `AlphaTabHandle` interface with all 13 methods
- Define `AlphaTabState` interface for playback state
- Define `TrackInfo` interface for track metadata

**Implementation**:

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
  volume: number; // 0-2, default 1.0
}

/**
 * Updated props for AlphaTabRenderer with external control support.
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

**Acceptance Criteria**:
- [ ] `AlphaTabHandle` interface exported with all 13 methods documented
- [ ] `AlphaTabState` interface includes all playback state fields
- [ ] `TrackInfo` interface includes volume field
- [ ] `AlphaTabRendererProps` interface extends existing props with new callbacks
- [ ] All types have JSDoc comments
- [ ] TypeScript compiles without errors

---

### Task 1.2: Add showControls and showProgressBar Props to AlphaTabRenderer

**Description**: Add props to conditionally hide the built-in toolbar and progress bar
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: None

**Technical Requirements**:
- Add `showControls?: boolean` prop (default: `true` for backwards compat during transition)
- Add `showProgressBar?: boolean` prop (default: `true` for backwards compat during transition)
- Wrap existing toolbar JSX in conditional render
- Wrap existing progress bar JSX in conditional render
- Ensure score render area always displays

**Implementation Changes to AlphaTabRenderer.tsx**:

```typescript
// Update props interface (import from types.ts later)
interface AlphaTabRendererProps {
  fileData: string;
  isPlaying?: boolean;
  onPlaybackChange?: (isPlaying: boolean) => void;
  readOnly?: boolean;
  // NEW PROPS
  showControls?: boolean;
  showProgressBar?: boolean;
}

// Update component signature
export const AlphaTabRenderer: React.FC<AlphaTabRendererProps> = ({
  fileData,
  isPlaying: externalIsPlaying,
  onPlaybackChange,
  readOnly = false,
  showControls = true,  // Default true for backwards compat
  showProgressBar = true, // Default true for backwards compat
}) => {
  // ... existing state and logic ...

  return (
    <div className="flex flex-col max-h-full bg-white text-black rounded-xl relative border border-zinc-200 overflow-hidden">
      {/* Toolbar - conditionally rendered */}
      {showControls && (
        <div className="bg-zinc-100 border-b border-zinc-300 p-2 flex items-center justify-between shrink-0">
          {/* ... existing toolbar content ... */}
        </div>
      )}

      {/* Progress Bar - conditionally rendered */}
      {showProgressBar && !readOnly && totalTime > 0 && (
        <div className="bg-zinc-100 border-b border-zinc-300 px-4 py-2 flex items-center gap-3 shrink-0">
          {/* ... existing progress bar content ... */}
        </div>
      )}

      {/* Loop selection hint - only if controls shown */}
      {showControls && selectionStart !== null && (
        <div className="bg-amber-100 border-b border-amber-400 text-amber-800 px-3 py-1 text-xs">
          Loop start set - Shift+Click another measure to set end
        </div>
      )}

      {/* Mixer Overlay - only if controls shown */}
      {showControls && showSettings && (
        <div ref={mixerPanelRef} className="...">
          {/* ... existing mixer content ... */}
        </div>
      )}

      {/* Render Area - always shown */}
      <div ref={rootRef} className="flex-1 overflow-auto relative bg-white">
        {/* ... existing render area ... */}
      </div>
    </div>
  );
};
```

**Acceptance Criteria**:
- [ ] `showControls={true}` renders toolbar (backwards compatible)
- [ ] `showControls={false}` hides toolbar, mixer, and loop hint
- [ ] `showProgressBar={true}` renders progress bar (backwards compatible)
- [ ] `showProgressBar={false}` hides progress bar
- [ ] Score render area always displays regardless of prop values
- [ ] All existing tests pass
- [ ] Visual regression test confirms toolbar visibility toggling

**Test Cases to Add**:

```typescript
describe('showControls prop', () => {
  it('renders toolbar when showControls={true}', () => {
    render(<AlphaTabRenderer fileData={mockFileData} showControls={true} />);
    // Find play button by its distinctive styling
    const buttons = screen.getAllByRole('button');
    const playButton = buttons.find(btn =>
      btn.classList.contains('rounded-full') &&
      btn.classList.contains('w-10')
    );
    expect(playButton).toBeInTheDocument();
  });

  it('hides toolbar when showControls={false}', () => {
    render(<AlphaTabRenderer fileData={mockFileData} showControls={false} />);
    const buttons = screen.queryAllByRole('button');
    const playButton = buttons.find(btn =>
      btn.classList.contains('rounded-full') &&
      btn.classList.contains('w-10')
    );
    expect(playButton).toBeUndefined();
  });

  it('defaults to showControls={true} for backwards compatibility', () => {
    render(<AlphaTabRenderer fileData={mockFileData} />);
    // Should find toolbar elements
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

describe('showProgressBar prop', () => {
  it('renders progress bar when showProgressBar={true} and has duration', async () => {
    render(<AlphaTabRenderer fileData={mockFileData} showProgressBar={true} />);

    // Trigger score load and position update
    await waitFor(() => {
      expect(mockApiInstance.scoreLoaded.on).toHaveBeenCalled();
    });

    const scoreLoadedHandler = mockApiInstance.scoreLoaded.on.mock.calls[0][0];
    act(() => {
      scoreLoadedHandler({ tracks: [], tempo: 120 });
    });

    const positionHandler = mockApiInstance.playerPositionChanged.on.mock.calls[0][0];
    act(() => {
      positionHandler({ currentTime: 1000, endTime: 60000 });
    });

    await waitFor(() => {
      expect(screen.getByText('0:01')).toBeInTheDocument();
      expect(screen.getByText('1:00')).toBeInTheDocument();
    });
  });

  it('hides progress bar when showProgressBar={false}', async () => {
    render(<AlphaTabRenderer fileData={mockFileData} showProgressBar={false} />);

    await waitFor(() => {
      expect(mockApiInstance.scoreLoaded.on).toHaveBeenCalled();
    });

    const scoreLoadedHandler = mockApiInstance.scoreLoaded.on.mock.calls[0][0];
    act(() => {
      scoreLoadedHandler({ tracks: [], tempo: 120 });
    });

    const positionHandler = mockApiInstance.playerPositionChanged.on.mock.calls[0][0];
    act(() => {
      positionHandler({ currentTime: 1000, endTime: 60000 });
    });

    // Time displays should not be present
    expect(screen.queryByText('0:01')).not.toBeInTheDocument();
  });
});
```

---

### Task 1.3: Implement onReady Callback with AlphaTabHandle

**Description**: Add onReady callback that provides an imperative handle when player initializes
**Size**: Large
**Priority**: High
**Dependencies**: Task 1.1, Task 1.2
**Can run parallel with**: None

**Technical Requirements**:
- Import `AlphaTabHandle` type from `practice/types.ts`
- Add `onReady` prop to component
- Create handle object with all control methods
- Call `onReady(handle)` when `playerReady` state becomes true
- Handle must call existing internal methods (togglePlay, stopPlayback, etc.)

**Implementation**:

```typescript
// At top of AlphaTabRenderer.tsx
import type { AlphaTabHandle, AlphaTabRendererProps } from './practice/types';

// Inside the component, after state declarations
export const AlphaTabRenderer: React.FC<AlphaTabRendererProps> = ({
  // ... existing props ...
  onReady,
  onStateChange,
  onPositionChange,
  onTracksLoaded,
  onError,
}) => {
  // ... existing state ...

  // Create stable handle object
  const createHandle = useCallback((): AlphaTabHandle => ({
    play: () => {
      if (!apiRef.current || !playerReady) return;
      pendingPlaybackActionRef.current = 'play';
      runPlaybackAction('play');
    },
    pause: () => {
      if (!apiRef.current || !playerReady) return;
      pendingPlaybackActionRef.current = 'pause';
      runPlaybackAction('pause');
    },
    stop: () => {
      stopPlayback();
    },
    seekTo: (percentage: number) => {
      seekTo(percentage);
    },
    setPlaybackSpeed: (speed: number) => {
      if (apiRef.current) {
        const clampedSpeed = Math.max(0.25, Math.min(2.0, speed));
        apiRef.current.playbackSpeed = clampedSpeed;
        setCurrentSpeed(clampedSpeed);
        if (originalTempo) {
          setCurrentBPM(Math.round(originalTempo * clampedSpeed));
        }
      }
    },
    setLoop: (enabled: boolean) => {
      if (apiRef.current) {
        apiRef.current.isLooping = enabled;
        setIsLooping(enabled);
      }
    },
    setLoopRange: (range) => {
      if (apiRef.current) {
        apiRef.current.playbackRange = range;
        setLoopRange(range ? { start: range.startTick, end: range.endTick } : null);
        if (!range) {
          setSelectionStart(null);
        }
      }
    },
    renderTrack: (index: number) => {
      renderTrack(index);
    },
    toggleTrackMute: (index: number) => {
      toggleTrackMute(index);
    },
    toggleTrackSolo: (index: number) => {
      toggleTrackSolo(index);
    },
    setTrackVolume: (index: number, volume: number) => {
      // Note: AlphaTab track volume API - may need adjustment based on actual API
      if (apiRef.current?.score?.tracks?.[index]) {
        const track = apiRef.current.score.tracks[index];
        const clampedVolume = Math.max(0, Math.min(2, volume));
        // AlphaTab uses playbackInfo for track settings
        // This may need API verification
        (track as any).playbackInfo.volume = clampedVolume;
      }
    },
    setMasterVolume: (volume: number) => {
      if (apiRef.current) {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        (apiRef.current as any).masterVolume = clampedVolume;
      }
    },
    setMetronomeVolume: (volume: number) => {
      if (apiRef.current) {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        (apiRef.current as any).metronomeVolume = clampedVolume;
      }
    },
  }), [playerReady, runPlaybackAction, originalTempo]);

  // Call onReady when player is ready
  useEffect(() => {
    if (playerReady && onReady) {
      onReady(createHandle());
    }
  }, [playerReady, onReady, createHandle]);

  // ... rest of component ...
};
```

**Acceptance Criteria**:
- [ ] `onReady` fires when player initializes with functional handle
- [ ] `handle.play()` starts playback
- [ ] `handle.pause()` pauses playback
- [ ] `handle.stop()` stops and returns to start
- [ ] `handle.seekTo(0.5)` seeks to 50% position
- [ ] `handle.setPlaybackSpeed(0.75)` sets speed to 75%
- [ ] `handle.setLoop(true)` enables looping
- [ ] `handle.setLoopRange({startTick, endTick})` sets loop range
- [ ] `handle.renderTrack(1)` renders track at index 1
- [ ] `handle.toggleTrackMute(0)` toggles mute on first track
- [ ] `handle.toggleTrackSolo(0)` toggles solo on first track
- [ ] Handle methods are safe to call before player ready (no-op)

**Test Cases**:

```typescript
describe('onReady callback', () => {
  it('calls onReady with handle when player is ready', async () => {
    const onReady = vi.fn();
    render(<AlphaTabRenderer fileData={mockFileData} onReady={onReady} />);

    // Trigger playerReady
    await waitFor(() => {
      expect(mockApiInstance.playerReady.on).toHaveBeenCalled();
    });

    const playerReadyHandler = mockApiInstance.playerReady.on.mock.calls[0][0];
    act(() => {
      playerReadyHandler();
    });

    // Wait for the setTimeout in handlePlayerReady (500ms)
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
        setTrackVolume: expect.any(Function),
        setMasterVolume: expect.any(Function),
        setMetronomeVolume: expect.any(Function),
      }));
    }, { timeout: 1000 });
  });

  it('handle.play() triggers AlphaTab play', async () => {
    let capturedHandle: AlphaTabHandle | null = null;
    const onReady = (h: AlphaTabHandle) => { capturedHandle = h; };

    render(<AlphaTabRenderer fileData={mockFileData} onReady={onReady} />);

    await waitFor(() => {
      expect(mockApiInstance.playerReady.on).toHaveBeenCalled();
    });

    const playerReadyHandler = mockApiInstance.playerReady.on.mock.calls[0][0];
    act(() => {
      playerReadyHandler();
    });

    await waitFor(() => {
      expect(capturedHandle).not.toBeNull();
    }, { timeout: 1000 });

    act(() => {
      capturedHandle!.play();
    });

    expect(mockApiInstance.play).toHaveBeenCalled();
  });

  it('handle.setPlaybackSpeed() changes AlphaTab playback speed', async () => {
    let capturedHandle: AlphaTabHandle | null = null;
    const onReady = (h: AlphaTabHandle) => { capturedHandle = h; };

    render(<AlphaTabRenderer fileData={mockFileData} onReady={onReady} />);

    await waitFor(() => {
      expect(mockApiInstance.playerReady.on).toHaveBeenCalled();
    });

    const playerReadyHandler = mockApiInstance.playerReady.on.mock.calls[0][0];
    act(() => {
      playerReadyHandler();
    });

    await waitFor(() => {
      expect(capturedHandle).not.toBeNull();
    }, { timeout: 1000 });

    act(() => {
      capturedHandle!.setPlaybackSpeed(0.5);
    });

    expect(mockApiInstance.playbackSpeed).toBe(0.5);
  });
});
```

---

### Task 1.4: Implement State Change Callbacks

**Description**: Add callbacks to emit state changes, position updates, and track info to parent
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1, Task 1.3
**Can run parallel with**: None

**Technical Requirements**:
- Add `onStateChange` callback prop - fires on any playback state change
- Add `onPositionChange` callback prop - fires on position update (throttled)
- Add `onTracksLoaded` callback prop - fires when score loads with track array
- Add `onError` callback prop - fires on errors

**Implementation**:

```typescript
// Inside AlphaTabRenderer component

// Emit state changes whenever relevant state updates
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
      masterVolume: 1.0, // TODO: Track actual volume when implemented
      metronomeVolume: 0, // TODO: Track actual volume when implemented
    });
  }
}, [
  internalIsPlaying,
  isLooping,
  currentSpeed,
  currentBPM,
  originalTempo,
  currentTrackIndex,
  metronomeBeat,
  onStateChange,
]);

// Emit position changes (already throttled in existing code)
useEffect(() => {
  if (onPositionChange) {
    onPositionChange(currentTime, totalTime);
  }
}, [currentTime, totalTime, onPositionChange]);

// In handleScoreLoaded callback inside initAlphaTab:
const handleScoreLoaded = (score: AlphaTabScore) => {
  if (!isMounted) return;
  clearTimeout(timeoutId);
  setTracks(score.tracks);
  setCurrentTrackIndex(0);

  const tempo = score.tempo || 120;
  setOriginalTempo(tempo);
  setCurrentBPM(Math.round(tempo * currentSpeed));

  // NEW: Emit tracks to parent
  if (onTracksLoaded) {
    onTracksLoaded(score.tracks.map((t, i) => ({
      index: i,
      name: t.name,
      isMute: t.playbackInfo.isMute,
      isSolo: t.playbackInfo.isSolo,
      volume: 1.0, // Default volume
    })));
  }

  setLoading(false);
};

// In handleError callback:
const handleError = (e: AlphaTabErrorEvent) => {
  if (!isMounted) return;
  console.error('[AlphaTab] Error Event:', e);
  clearTimeout(timeoutId);

  let errorMsg = 'Failed to load Guitar Pro file.';
  if (e?.message) {
    errorMsg += ` ${e.message}`;
  }
  if (e?.inner) {
    errorMsg += ` Details: ${e.inner}`;
  }
  errorMsg += ' The file may be corrupted, an unsupported version, or incompatible with this environment.';

  setError(errorMsg);
  setLoading(false);

  // NEW: Emit error to parent
  if (onError) {
    onError(errorMsg);
  }
};
```

**Acceptance Criteria**:
- [ ] `onStateChange` fires on every playback state change
- [ ] `onStateChange` includes all state fields (isPlaying, isLooping, currentSpeed, etc.)
- [ ] `onPositionChange` fires with throttled position updates (~10 FPS)
- [ ] `onTracksLoaded` fires with track array when score loads
- [ ] `onError` fires with error message on load failure
- [ ] State callbacks are memoization-safe (useCallback in parent works)

**Test Cases**:

```typescript
describe('state change callbacks', () => {
  it('onStateChange fires when playback starts', async () => {
    const onStateChange = vi.fn();
    render(<AlphaTabRenderer fileData={mockFileData} onStateChange={onStateChange} />);

    await waitFor(() => {
      expect(mockApiInstance.playerStateChanged.on).toHaveBeenCalled();
    });

    const stateHandler = mockApiInstance.playerStateChanged.on.mock.calls[0][0];
    act(() => {
      stateHandler({ state: 1 });
    });

    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({
        isPlaying: true,
      }));
    });
  });

  it('onPositionChange fires during playback', async () => {
    const onPositionChange = vi.fn();
    render(<AlphaTabRenderer fileData={mockFileData} onPositionChange={onPositionChange} />);

    await waitFor(() => {
      expect(mockApiInstance.playerPositionChanged.on).toHaveBeenCalled();
    });

    const positionHandler = mockApiInstance.playerPositionChanged.on.mock.calls[0][0];
    act(() => {
      positionHandler({ currentTime: 5000, endTime: 60000 });
    });

    await waitFor(() => {
      expect(onPositionChange).toHaveBeenCalledWith(5000, 60000);
    });
  });

  it('onTracksLoaded fires with track array on score load', async () => {
    const onTracksLoaded = vi.fn();
    const mockTracks = [
      { name: 'Guitar', playbackInfo: { isMute: false, isSolo: false } },
      { name: 'Bass', playbackInfo: { isMute: false, isSolo: false } },
    ];

    render(<AlphaTabRenderer fileData={mockFileData} onTracksLoaded={onTracksLoaded} />);

    await waitFor(() => {
      expect(mockApiInstance.scoreLoaded.on).toHaveBeenCalled();
    });

    const scoreLoadedHandler = mockApiInstance.scoreLoaded.on.mock.calls[0][0];
    act(() => {
      scoreLoadedHandler({ tracks: mockTracks, tempo: 120 });
    });

    await waitFor(() => {
      expect(onTracksLoaded).toHaveBeenCalledWith([
        { index: 0, name: 'Guitar', isMute: false, isSolo: false, volume: 1.0 },
        { index: 1, name: 'Bass', isMute: false, isSolo: false, volume: 1.0 },
      ]);
    });
  });

  it('onError fires when file fails to load', async () => {
    const onError = vi.fn();
    render(<AlphaTabRenderer fileData={mockFileData} onError={onError} />);

    await waitFor(() => {
      expect(mockApiInstance.error.on).toHaveBeenCalled();
    });

    const errorHandler = mockApiInstance.error.on.mock.calls[0][0];
    act(() => {
      errorHandler({ message: 'Invalid file format' });
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.stringContaining('Invalid file format'));
    });
  });
});
```

---

### Task 1.5: Create Practice Module Barrel Export

**Description**: Create index.ts barrel export for practice components
**Size**: Small
**Priority**: Medium
**Dependencies**: Task 1.1
**Can run parallel with**: Task 1.2, 1.3, 1.4

**Implementation**:

```typescript
// src/components/practice/index.ts

// Types
export type {
  AlphaTabHandle,
  AlphaTabState,
  TrackInfo,
  AlphaTabRendererProps,
} from './types';

// Components (to be added in Phase 2)
// export { PracticeControlBar } from './PracticeControlBar';
// export { PlaybackControls } from './PlaybackControls';
// export { ChartTabs } from './ChartTabs';
// export { TrackSelector } from './TrackSelector';
// export { TempoControl } from './TempoControl';
// export { MetronomeIndicator } from './MetronomeIndicator';
// export { ProgressBar } from './ProgressBar';
```

**Acceptance Criteria**:
- [ ] `src/components/practice/index.ts` exports all types
- [ ] Types can be imported from `@/components/practice`
- [ ] No circular dependencies

---

## Phase 2: Unified Control Bar Components

**Objective**: Build the unified control bar and its sub-components following the design system.

### Task 2.1: Create PlaybackControls Component

**Description**: Build the play/pause/stop/loop button group for GP playback
**Size**: Medium
**Priority**: High
**Dependencies**: Phase 1 complete
**Can run parallel with**: Task 2.2, 2.3, 2.4, 2.5, 2.6

**Technical Requirements**:
- Use shadcn/ui Button component from primitives
- Use Tooltip for all icon buttons
- Visual state for playing (amber bg), looping (amber bg)
- Disabled state when no GP chart active
- Call parent callbacks (onPlay, onPause, onStop, onToggleLoop)

**Implementation**:

```typescript
// src/components/practice/PlaybackControls.tsx

import { memo } from 'react';
import { Play, Pause, Square, Repeat } from 'lucide-react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';

export interface PlaybackControlsProps {
  isPlaying: boolean;
  isLooping: boolean;
  disabled?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onToggleLoop: () => void;
}

export const PlaybackControls = memo(function PlaybackControls({
  isPlaying,
  isLooping,
  disabled = false,
  onPlay,
  onPause,
  onStop,
  onToggleLoop,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <TooltipProvider delayDuration={100}>
        {/* Play/Pause Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={isPlaying ? onPause : onPlay}
              disabled={disabled}
              className={cn(
                'h-10 w-10 rounded-full p-0',
                isPlaying && 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={18} />
              ) : (
                <Play size={18} className="ml-0.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isPlaying ? 'Pause' : 'Play'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Stop Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onStop}
              disabled={disabled}
              className="h-9 w-9 p-0"
              aria-label="Stop"
            >
              <Square size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Stop</p>
          </TooltipContent>
        </Tooltip>

        {/* Loop Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleLoop}
              disabled={disabled}
              className={cn(
                'h-9 w-9 p-0',
                isLooping && 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
              aria-label={isLooping ? 'Disable loop' : 'Enable loop'}
            >
              <Repeat size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isLooping ? 'Disable loop' : 'Enable loop'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
});

PlaybackControls.displayName = 'PlaybackControls';
```

**Acceptance Criteria**:
- [ ] Play button shows Play icon when stopped, Pause when playing
- [ ] Playing state highlighted with primary color
- [ ] Loop button highlighted when looping enabled
- [ ] All buttons have tooltips
- [ ] All buttons have aria-labels
- [ ] Disabled state grays out all buttons
- [ ] Uses shadcn/ui Button component

**Test Cases**:

```typescript
// src/components/practice/PlaybackControls.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaybackControls } from './PlaybackControls';

describe('PlaybackControls', () => {
  const defaultProps = {
    isPlaying: false,
    isLooping: false,
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onStop: vi.fn(),
    onToggleLoop: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Play icon when not playing', () => {
    render(<PlaybackControls {...defaultProps} isPlaying={false} />);
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
  });

  it('shows Pause icon when playing', () => {
    render(<PlaybackControls {...defaultProps} isPlaying={true} />);
    expect(screen.getByLabelText('Pause')).toBeInTheDocument();
  });

  it('calls onPlay when play clicked', () => {
    render(<PlaybackControls {...defaultProps} isPlaying={false} />);
    fireEvent.click(screen.getByLabelText('Play'));
    expect(defaultProps.onPlay).toHaveBeenCalled();
  });

  it('calls onPause when pause clicked', () => {
    render(<PlaybackControls {...defaultProps} isPlaying={true} />);
    fireEvent.click(screen.getByLabelText('Pause'));
    expect(defaultProps.onPause).toHaveBeenCalled();
  });

  it('calls onStop when stop clicked', () => {
    render(<PlaybackControls {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Stop'));
    expect(defaultProps.onStop).toHaveBeenCalled();
  });

  it('calls onToggleLoop when loop clicked', () => {
    render(<PlaybackControls {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Enable loop'));
    expect(defaultProps.onToggleLoop).toHaveBeenCalled();
  });

  it('highlights loop button when looping', () => {
    render(<PlaybackControls {...defaultProps} isLooping={true} />);
    const loopButton = screen.getByLabelText('Disable loop');
    expect(loopButton).toHaveClass('bg-primary');
  });

  it('disables all buttons when disabled prop is true', () => {
    render(<PlaybackControls {...defaultProps} disabled={true} />);
    expect(screen.getByLabelText('Play')).toBeDisabled();
    expect(screen.getByLabelText('Stop')).toBeDisabled();
    expect(screen.getByLabelText('Enable loop')).toBeDisabled();
  });
});
```

---

### Task 2.2: Create ChartTabs Component

**Description**: Build the chart type selector tabs that remain stable when song list toggles
**Size**: Medium
**Priority**: High
**Dependencies**: Phase 1 complete
**Can run parallel with**: Task 2.1, 2.3, 2.4, 2.5, 2.6

**Technical Requirements**:
- Display tabs for each chart in the song
- Show appropriate icon per chart type (GP, TEXT, PDF, IMAGE)
- Highlight active chart
- Call onSelectChart when tab clicked
- Position must be stable (center-justified) regardless of song list visibility

**Implementation**:

```typescript
// src/components/practice/ChartTabs.tsx

import { memo } from 'react';
import { Guitar, FileText, File, Music2 } from 'lucide-react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';
import type { SongChart } from '@/types';

const CHART_ICON_MAP = {
  GP: Guitar,
  PDF: FileText,
  IMAGE: File,
  TEXT: Music2,
} as const;

export interface ChartTabsProps {
  charts: SongChart[];
  activeChartId: string | null;
  onSelectChart: (id: string) => void;
}

export const ChartTabs = memo(function ChartTabs({
  charts,
  activeChartId,
  onSelectChart,
}: ChartTabsProps) {
  if (charts.length === 0) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-1.5"
      data-testid="chart-tabs"
      role="tablist"
      aria-label="Chart type selector"
    >
      <TooltipProvider delayDuration={100}>
        {charts.map((chart) => {
          const Icon = CHART_ICON_MAP[chart.type];
          const isActive = chart.id === activeChartId;

          return (
            <Tooltip key={chart.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectChart(chart.id)}
                  role="tab"
                  aria-selected={isActive}
                  data-testid={`chart-tab-${chart.type}`}
                  className={cn(
                    'h-8 px-3 gap-1.5 text-xs font-medium',
                    'border transition-colors motion-reduce:transition-none',
                    isActive
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon size={14} data-testid={`chart-icon-${chart.type}`} />
                  <span className="truncate max-w-[80px]">{chart.name}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{chart.name} ({chart.type})</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
});

ChartTabs.displayName = 'ChartTabs';
```

**Acceptance Criteria**:
- [ ] Renders tab for each chart in array
- [ ] Shows correct icon per chart type (GP, TEXT, PDF, IMAGE)
- [ ] Active chart has highlighted styling (bg-primary/20)
- [ ] Calls onSelectChart with chart ID when clicked
- [ ] Returns null when charts array is empty
- [ ] Has role="tablist" and role="tab" for accessibility
- [ ] Chart tabs stay stable when song list toggles (no layout shift)

**Test Cases**:

```typescript
// src/components/practice/ChartTabs.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChartTabs } from './ChartTabs';
import type { SongChart } from '@/types';

const mockCharts: SongChart[] = [
  { id: 'chart-1', name: 'Guitar Tab', type: 'GP', content: '', annotations: [] },
  { id: 'chart-2', name: 'Lead Sheet', type: 'TEXT', content: 'C Am F G', annotations: [] },
  { id: 'chart-3', name: 'Score PDF', type: 'PDF', url: 'test.pdf', annotations: [] },
];

describe('ChartTabs', () => {
  const defaultProps = {
    charts: mockCharts,
    activeChartId: 'chart-1',
    onSelectChart: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tab for each chart', () => {
    render(<ChartTabs {...defaultProps} />);
    expect(screen.getByText('Guitar Tab')).toBeInTheDocument();
    expect(screen.getByText('Lead Sheet')).toBeInTheDocument();
    expect(screen.getByText('Score PDF')).toBeInTheDocument();
  });

  it('shows correct icon per chart type', () => {
    render(<ChartTabs {...defaultProps} />);
    expect(screen.getByTestId('chart-icon-GP')).toBeInTheDocument();
    expect(screen.getByTestId('chart-icon-TEXT')).toBeInTheDocument();
    expect(screen.getByTestId('chart-icon-PDF')).toBeInTheDocument();
  });

  it('highlights active chart', () => {
    render(<ChartTabs {...defaultProps} activeChartId="chart-1" />);
    const activeTab = screen.getByRole('tab', { selected: true });
    expect(activeTab).toHaveClass('bg-primary/20');
  });

  it('calls onSelectChart when tab clicked', () => {
    render(<ChartTabs {...defaultProps} />);
    fireEvent.click(screen.getByText('Lead Sheet'));
    expect(defaultProps.onSelectChart).toHaveBeenCalledWith('chart-2');
  });

  it('returns null when charts array is empty', () => {
    const { container } = render(<ChartTabs {...defaultProps} charts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('has correct accessibility attributes', () => {
    render(<ChartTabs {...defaultProps} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });
});
```

---

### Task 2.3: Create TrackSelector Component

**Description**: Build the track dropdown for selecting and managing GP tracks
**Size**: Medium
**Priority**: High
**Dependencies**: Phase 1 complete
**Can run parallel with**: Task 2.1, 2.2, 2.4, 2.5, 2.6

**Technical Requirements**:
- Dropdown showing all tracks
- Current track name visible in trigger
- Mute/Solo buttons per track
- Track selection changes rendered track
- Uses shadcn/ui DropdownMenu

**Implementation**:

```typescript
// src/components/practice/TrackSelector.tsx

import { memo } from 'react';
import { ChevronDown, Volume2, VolumeX, Star } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';
import type { TrackInfo } from './types';

export interface TrackSelectorProps {
  tracks: TrackInfo[];
  currentTrackIndex: number;
  onSelectTrack: (index: number) => void;
  onToggleMute: (index: number) => void;
  onToggleSolo: (index: number) => void;
}

export const TrackSelector = memo(function TrackSelector({
  tracks,
  currentTrackIndex,
  onSelectTrack,
  onToggleMute,
  onToggleSolo,
}: TrackSelectorProps) {
  const currentTrack = tracks[currentTrackIndex];

  if (!currentTrack || tracks.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 text-xs font-medium max-w-[140px]"
                data-testid="track-selector"
              >
                <div
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    currentTrack.isMute ? 'bg-destructive' : 'bg-primary'
                  )}
                />
                <span className="truncate">{currentTrack.name}</span>
                <ChevronDown size={14} className="shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Select track to display</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent
        align="end"
        className="w-56"
        data-testid="track-dropdown"
      >
        {tracks.map((track, index) => (
          <DropdownMenuItem
            key={index}
            className={cn(
              'flex items-center justify-between gap-2 py-2',
              index === currentTrackIndex && 'bg-muted'
            )}
          >
            <button
              className="flex-1 flex items-center gap-2 text-left"
              onClick={() => onSelectTrack(index)}
            >
              <div
                className={cn(
                  'w-2.5 h-2.5 rounded-full shrink-0',
                  index === currentTrackIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              />
              <span className={cn(
                'truncate text-sm',
                index === currentTrackIndex && 'font-semibold'
              )}>
                {track.name}
              </span>
            </button>

            <div className="flex gap-1 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMute(index);
                }}
                className={cn(
                  'p-1 rounded text-xs font-bold transition-colors',
                  track.isMute
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                )}
                title={track.isMute ? 'Unmute' : 'Mute'}
              >
                {track.isMute ? <VolumeX size={12} /> : <Volume2 size={12} />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSolo(index);
                }}
                className={cn(
                  'p-1 rounded text-xs font-bold transition-colors',
                  track.isSolo
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                )}
                title={track.isSolo ? 'Unsolo' : 'Solo'}
              >
                <Star size={12} className={track.isSolo ? 'fill-current' : ''} />
              </button>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

TrackSelector.displayName = 'TrackSelector';
```

**Acceptance Criteria**:
- [ ] Shows current track name in trigger button
- [ ] Dropdown lists all tracks
- [ ] Current track highlighted in dropdown
- [ ] Clicking track name calls onSelectTrack
- [ ] Mute button toggles mute, shows visual state
- [ ] Solo button toggles solo, shows visual state
- [ ] Returns null when no tracks
- [ ] Uses shadcn/ui DropdownMenu components

---

### Task 2.4: Create TempoControl Component

**Description**: Build the BPM slider and numeric display with reset functionality
**Size**: Medium
**Priority**: High
**Dependencies**: Phase 1 complete
**Can run parallel with**: Task 2.1, 2.2, 2.3, 2.5, 2.6

**Technical Requirements**:
- Display current BPM with JetBrains Mono font
- Slider for tempo adjustment (0.25x to 2x of original)
- Reset button appears when not at original tempo
- Click on BPM to enter direct input mode
- Shows min/max BPM range

**Implementation**:

```typescript
// src/components/practice/TempoControl.tsx

import { memo, useState, useCallback } from 'react';
import { Timer, RotateCcw } from 'lucide-react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';

export interface TempoControlProps {
  currentBPM: number;
  originalTempo: number;
  currentSpeed: number;
  onSetBPM: (bpm: number) => void;
  onReset: () => void;
}

export const TempoControl = memo(function TempoControl({
  currentBPM,
  originalTempo,
  currentSpeed,
  onSetBPM,
  onReset,
}: TempoControlProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const minBPM = Math.round(originalTempo * 0.25);
  const maxBPM = Math.round(originalTempo * 2.0);
  const isModified = currentSpeed !== 1.0;

  const handleStartEdit = useCallback(() => {
    setInputValue(currentBPM.toString());
    setIsEditing(true);
  }, [currentBPM]);

  const handleSubmitEdit = useCallback(() => {
    const newBPM = parseInt(inputValue);
    if (!isNaN(newBPM)) {
      const clampedBPM = Math.max(minBPM, Math.min(maxBPM, newBPM));
      onSetBPM(clampedBPM);
    }
    setIsEditing(false);
  }, [inputValue, minBPM, maxBPM, onSetBPM]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmitEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  }, [handleSubmitEdit]);

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider delayDuration={100}>
        {/* BPM Display / Input */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleStartEdit}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded',
                'bg-muted hover:bg-muted/80 transition-colors',
                'cursor-pointer'
              )}
              aria-label="Click to edit BPM"
            >
              <Timer size={14} className="text-muted-foreground" />
              {isEditing ? (
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onBlur={handleSubmitEdit}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className={cn(
                    'w-12 bg-background border border-primary rounded px-1',
                    'text-sm font-mono tabular-nums text-center',
                    'focus:outline-none focus:ring-1 focus:ring-primary'
                  )}
                  onClick={(e) => e.stopPropagation()}
                  data-testid="bpm-input"
                />
              ) : (
                <span className="text-sm font-mono tabular-nums font-semibold text-foreground">
                  {currentBPM}
                </span>
              )}
              <span className="text-xs text-muted-foreground">BPM</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to enter BPM directly</p>
          </TooltipContent>
        </Tooltip>

        {/* Reset Button */}
        {isModified && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-7 px-2 text-xs gap-1"
              >
                <RotateCcw size={12} />
                Reset
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset to original tempo ({originalTempo} BPM)</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* BPM Slider */}
        <div className="flex items-center gap-2 bg-muted rounded px-2 py-1">
          <input
            type="range"
            min={minBPM}
            max={maxBPM}
            step="1"
            value={currentBPM}
            onChange={(e) => onSetBPM(parseInt(e.target.value))}
            className="w-24 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
            aria-label="Tempo slider"
            data-testid="bpm-slider"
          />
          <div className="flex gap-2 text-[10px] text-muted-foreground font-mono tabular-nums">
            <span>{minBPM}</span>
            <span className="text-foreground font-semibold">{currentBPM}</span>
            <span>{maxBPM}</span>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
});

TempoControl.displayName = 'TempoControl';
```

**Acceptance Criteria**:
- [ ] Displays current BPM with font-mono tabular-nums
- [ ] Slider adjusts BPM within 0.25x-2.0x range
- [ ] Reset button only shows when tempo modified
- [ ] Click on BPM opens direct input
- [ ] Enter/Escape handles input submission/cancel
- [ ] Min/max BPM shown near slider
- [ ] Uses design system typography

---

### Task 2.5: Create MetronomeIndicator Component

**Description**: Build the visual beat indicator for metronome
**Size**: Small
**Priority**: Medium
**Dependencies**: Phase 1 complete
**Can run parallel with**: Task 2.1, 2.2, 2.3, 2.4, 2.6

**Technical Requirements**:
- Four beat indicators (dots)
- Current beat highlighted with scale animation
- Amber color for active beat
- Muted color for inactive beats

**Implementation**:

```typescript
// src/components/practice/MetronomeIndicator.tsx

import { memo } from 'react';
import { cn } from '@/lib/utils';

export interface MetronomeIndicatorProps {
  currentBeat: number; // 0 = no beat, 1-4 = current beat
}

export const MetronomeIndicator = memo(function MetronomeIndicator({
  currentBeat,
}: MetronomeIndicatorProps) {
  return (
    <div
      className="flex items-center gap-1 px-2 py-1 bg-muted rounded"
      aria-label={`Metronome beat ${currentBeat > 0 ? currentBeat : 'inactive'}`}
      data-testid="metronome-indicator"
    >
      {[1, 2, 3, 4].map((beat) => (
        <div
          key={beat}
          className={cn(
            'w-2 h-2 rounded-full transition-all duration-75',
            'motion-reduce:transition-none',
            currentBeat === beat
              ? 'bg-primary scale-150'
              : 'bg-muted-foreground/30'
          )}
          data-testid={`beat-${beat}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
});

MetronomeIndicator.displayName = 'MetronomeIndicator';
```

**Acceptance Criteria**:
- [ ] Four beat indicator dots rendered
- [ ] Current beat (1-4) highlighted with amber and scale
- [ ] Beat 0 shows all dots as inactive
- [ ] Animation respects prefers-reduced-motion
- [ ] Has appropriate aria-label

---

### Task 2.6: Create ProgressBar Component

**Description**: Build the playback progress bar with seek functionality
**Size**: Medium
**Priority**: High
**Dependencies**: Phase 1 complete
**Can run parallel with**: Task 2.1, 2.2, 2.3, 2.4, 2.5

**Technical Requirements**:
- Shows current time and total time in m:ss format
- Progress fill shows current position
- Clicking anywhere seeks to that position
- Hover shows scrubber handle
- Times use font-mono tabular-nums

**Implementation**:

```typescript
// src/components/practice/ProgressBar.tsx

import { memo, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  currentTime: number; // milliseconds
  totalTime: number; // milliseconds
  onSeek: (percentage: number) => void;
}

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const ProgressBar = memo(function ProgressBar({
  currentTime,
  totalTime,
  onSeek,
}: ProgressBarProps) {
  const percentage = useMemo(() =>
    totalTime > 0 ? (currentTime / totalTime) * 100 : 0,
    [currentTime, totalTime]
  );

  const formattedCurrent = useMemo(() => formatTime(currentTime), [currentTime]);
  const formattedTotal = useMemo(() => formatTime(totalTime), [totalTime]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickPercentage = Math.max(0, Math.min(1, x / rect.width));
    onSeek(clickPercentage);
  }, [onSeek]);

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 bg-muted/30 border-t border-border"
      data-testid="progress-bar"
    >
      <span className="text-xs font-mono tabular-nums text-muted-foreground w-10 text-right">
        {formattedCurrent}
      </span>

      <div
        className="flex-1 h-2 bg-muted rounded-full cursor-pointer group relative"
        onClick={handleClick}
        role="slider"
        aria-valuenow={currentTime}
        aria-valuemin={0}
        aria-valuemax={totalTime}
        aria-label="Playback position"
        tabIndex={0}
      >
        {/* Progress fill */}
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />

        {/* Hover scrubber handle */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-3 h-3',
            'bg-background border-2 border-primary rounded-full',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'pointer-events-none'
          )}
          style={{ left: `calc(${percentage}% - 6px)` }}
        />
      </div>

      <span className="text-xs font-mono tabular-nums text-muted-foreground w-10">
        {formattedTotal}
      </span>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';
```

**Acceptance Criteria**:
- [ ] Current and total time formatted as m:ss
- [ ] Progress bar fills to correct percentage
- [ ] Clicking bar calls onSeek with correct percentage
- [ ] Hover shows scrubber handle
- [ ] Times use font-mono tabular-nums
- [ ] Has role="slider" and aria attributes

---

### Task 2.7: Create PracticeControlBar Component

**Description**: Assemble all sub-components into the unified control bar
**Size**: Large
**Priority**: High
**Dependencies**: Tasks 2.1-2.6
**Can run parallel with**: None

**Technical Requirements**:
- Three-section layout (left, center, right)
- Left: Song list toggle + song info
- Center: Playback controls + Chart tabs (center-justified)
- Right: Track selector + Tempo control + Metronome
- Progress bar as separate row below main controls
- Adapts to GP vs non-GP chart modes
- Total height ≤ 100px (56px main + 44px progress)

**Implementation**:

```typescript
// src/components/practice/PracticeControlBar.tsx

import { memo } from 'react';
import { PanelLeftClose, PanelLeftOpen, Clock } from 'lucide-react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';
import { PlaybackControls } from './PlaybackControls';
import { ChartTabs } from './ChartTabs';
import { TrackSelector } from './TrackSelector';
import { TempoControl } from './TempoControl';
import { MetronomeIndicator } from './MetronomeIndicator';
import { ProgressBar } from './ProgressBar';
import type { Song, SongChart } from '@/types';
import type { TrackInfo } from './types';

export interface PracticeControlBarProps {
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
  onResetTempo?: () => void;

  // Track controls (for GP charts)
  tracks?: TrackInfo[];
  currentTrackIndex?: number;
  onSelectTrack?: (index: number) => void;
  onToggleTrackMute?: (index: number) => void;
  onToggleTrackSolo?: (index: number) => void;

  // Non-GP metronome controls
  metronomeState?: {
    bpm: number;
    isActive: boolean;
  };
  onMetronomeBpmChange?: (bpm: number) => void;
  onMetronomeToggle?: () => void;
}

export const PracticeControlBar = memo(function PracticeControlBar({
  song,
  showSongList,
  onToggleSongList,
  charts,
  activeChartId,
  onSelectChart,
  isGuitarPro,
  playbackState,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onToggleLoop,
  onSetBPM,
  onResetTempo,
  tracks,
  currentTrackIndex,
  onSelectTrack,
  onToggleTrackMute,
  onToggleTrackSolo,
  metronomeState,
  onMetronomeBpmChange,
  onMetronomeToggle,
}: PracticeControlBarProps) {
  const currentSpeed = playbackState
    ? playbackState.currentBPM / playbackState.originalTempo
    : 1.0;

  return (
    <header
      className="border-b border-border bg-card shrink-0"
      data-testid="practice-control-bar"
    >
      {/* Main control row */}
      <div className="flex items-center gap-4 px-4 py-2 h-14">
        {/* Left: Toggle + Song info */}
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleSongList}
                  className={cn('h-9 w-9 p-0', showSongList && 'bg-muted')}
                  aria-label={showSongList ? 'Hide song list' : 'Show song list'}
                  data-testid="toggle-button"
                >
                  {showSongList ? (
                    <PanelLeftClose size={18} />
                  ) : (
                    <PanelLeftOpen size={18} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showSongList ? 'Hide song list' : 'Show song list'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="min-w-0">
            <h2 className="text-lg font-bold font-serif text-foreground truncate">
              {song?.title || 'Select a Song'}
            </h2>
            {song && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">{song.bpm} BPM</span>
                {song.key && (
                  <>
                    <span className="text-border">•</span>
                    <span>Key of {song.key}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Playback + Charts - flex-1, centered */}
        <div className="flex-1 flex items-center justify-center gap-4">
          {isGuitarPro && playbackState && onPlay && onPause && onStop && onToggleLoop && (
            <PlaybackControls
              isPlaying={playbackState.isPlaying}
              isLooping={playbackState.isLooping}
              disabled={!song}
              onPlay={onPlay}
              onPause={onPause}
              onStop={onStop}
              onToggleLoop={onToggleLoop}
            />
          )}

          <ChartTabs
            charts={charts}
            activeChartId={activeChartId}
            onSelectChart={onSelectChart}
          />
        </div>

        {/* Right: Track/BPM/Metronome */}
        <div className="flex items-center gap-3 shrink-0">
          {isGuitarPro && playbackState && tracks && currentTrackIndex !== undefined ? (
            <>
              {onSelectTrack && onToggleTrackMute && onToggleTrackSolo && (
                <TrackSelector
                  tracks={tracks}
                  currentTrackIndex={currentTrackIndex}
                  onSelectTrack={onSelectTrack}
                  onToggleMute={onToggleTrackMute}
                  onToggleSolo={onToggleTrackSolo}
                />
              )}

              {onSetBPM && onResetTempo && (
                <TempoControl
                  currentBPM={playbackState.currentBPM}
                  originalTempo={playbackState.originalTempo}
                  currentSpeed={currentSpeed}
                  onSetBPM={onSetBPM}
                  onReset={onResetTempo}
                />
              )}

              <MetronomeIndicator currentBeat={playbackState.metronomeBeat} />
            </>
          ) : (
            // Non-GP metronome controls
            metronomeState && onMetronomeBpmChange && onMetronomeToggle && (
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1 border border-border">
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={onMetronomeToggle}
                        className={cn(
                          'p-2 rounded-md transition-colors',
                          metronomeState.isActive
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'text-muted-foreground hover:bg-background hover:text-foreground'
                        )}
                        aria-label={metronomeState.isActive ? 'Stop metronome' : 'Start metronome'}
                      >
                        <Clock size={18} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{metronomeState.isActive ? 'Stop metronome' : 'Start metronome'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <input
                  type="range"
                  min="40"
                  max="220"
                  value={metronomeState.bpm}
                  onChange={(e) => onMetronomeBpmChange(parseInt(e.target.value))}
                  className="w-20 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                  aria-label="Metronome BPM"
                />
                <span className="text-xs font-mono w-8 text-center tabular-nums text-foreground">
                  {metronomeState.bpm}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Progress bar row - only for GP */}
      {isGuitarPro && playbackState && playbackState.totalTime > 0 && onSeek && (
        <ProgressBar
          currentTime={playbackState.currentTime}
          totalTime={playbackState.totalTime}
          onSeek={onSeek}
        />
      )}
    </header>
  );
});

PracticeControlBar.displayName = 'PracticeControlBar';
```

**Acceptance Criteria**:
- [ ] Three-section layout renders correctly
- [ ] Song title uses font-serif
- [ ] BPM uses font-mono tabular-nums
- [ ] Toggle button shows correct icon for state
- [ ] Playback controls only show for GP charts
- [ ] Chart tabs stay centered regardless of song list state
- [ ] Track selector shows when GP chart active
- [ ] Non-GP metronome shows when not GP
- [ ] Progress bar only shows for GP with duration
- [ ] Total height ≤ 100px

---

## Phase 3: PracticeRoom Integration

**Objective**: Replace the existing PracticeRoom header and chart selector with the unified control bar.

### Task 3.1: Add AlphaTab State Management to PracticeRoom

**Description**: Lift AlphaTab state to PracticeRoom component for control bar integration
**Size**: Large
**Priority**: High
**Dependencies**: Phase 2 complete
**Can run parallel with**: None

**Technical Requirements**:
- Add alphaTabRef to hold handle
- Add state for gpState (AlphaTabState)
- Add state for gpTracks (TrackInfo[])
- Add state for gpPosition (current/total)
- Create callbacks for all control bar actions
- Pass callbacks to PracticeControlBar

**Implementation**:

```typescript
// In PracticeRoom.tsx - add after existing state declarations

// AlphaTab control state
const alphaTabRef = useRef<AlphaTabHandle | null>(null);
const [gpState, setGpState] = useState<AlphaTabState | null>(null);
const [gpTracks, setGpTracks] = useState<TrackInfo[]>([]);
const [gpPosition, setGpPosition] = useState({ current: 0, total: 0 });

// AlphaTab callbacks
const handleAlphaTabReady = useCallback((handle: AlphaTabHandle) => {
  alphaTabRef.current = handle;
}, []);

const handleAlphaTabStateChange = useCallback((state: AlphaTabState) => {
  setGpState(state);
}, []);

const handleAlphaTabPositionChange = useCallback((current: number, total: number) => {
  setGpPosition({ current, total });
}, []);

const handleAlphaTabTracksLoaded = useCallback((tracks: TrackInfo[]) => {
  setGpTracks(tracks);
}, []);

// Control bar playback callbacks
const handlePlay = useCallback(() => {
  alphaTabRef.current?.play();
}, []);

const handlePause = useCallback(() => {
  alphaTabRef.current?.pause();
}, []);

const handleStop = useCallback(() => {
  alphaTabRef.current?.stop();
}, []);

const handleSeek = useCallback((percentage: number) => {
  alphaTabRef.current?.seekTo(percentage);
}, []);

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

const handleResetTempo = useCallback(() => {
  alphaTabRef.current?.setPlaybackSpeed(1.0);
}, []);

const handleSelectTrack = useCallback((index: number) => {
  alphaTabRef.current?.renderTrack(index);
}, []);

const handleToggleTrackMute = useCallback((index: number) => {
  alphaTabRef.current?.toggleTrackMute(index);
}, []);

const handleToggleTrackSolo = useCallback((index: number) => {
  alphaTabRef.current?.toggleTrackSolo(index);
}, []);

// Clear AlphaTab state when chart changes
useEffect(() => {
  if (!isGuitarPro) {
    alphaTabRef.current = null;
    setGpState(null);
    setGpTracks([]);
    setGpPosition({ current: 0, total: 0 });
  }
}, [isGuitarPro]);
```

**Acceptance Criteria**:
- [ ] AlphaTab handle captured via onReady
- [ ] GP state updates from AlphaTab callbacks
- [ ] State cleared when switching away from GP chart
- [ ] All control callbacks properly call handle methods
- [ ] Callbacks are memoized with useCallback

---

### Task 3.2: Replace PracticeRoom Header with PracticeControlBar

**Description**: Remove old header and chart selector, integrate PracticeControlBar
**Size**: Medium
**Priority**: High
**Dependencies**: Task 3.1
**Can run parallel with**: None

**Technical Requirements**:
- Remove existing header element
- Remove separate chart selector row
- Add PracticeControlBar with all props
- Update AlphaTabRenderer to use showControls={false}
- Verify layout height reduction

**Implementation**:

```typescript
// In PracticeRoom.tsx - update render

return (
  <div className="h-full flex flex-col bg-background text-foreground">
    {/* NEW: Unified Control Bar */}
    <PracticeControlBar
      song={selectedSong ?? null}
      showSongList={showSongList}
      onToggleSongList={toggleSongList}
      charts={selectedSong?.charts ?? []}
      activeChartId={activeChartId}
      onSelectChart={handleChartSelect}
      isGuitarPro={isGuitarPro}
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
      onResetTempo={handleResetTempo}
      tracks={gpTracks}
      currentTrackIndex={gpState?.currentTrackIndex}
      onSelectTrack={handleSelectTrack}
      onToggleTrackMute={handleToggleTrackMute}
      onToggleTrackSolo={handleToggleTrackSolo}
      metronomeState={{ bpm: metronomeBpm, isActive: metronomeActive }}
      onMetronomeBpmChange={setMetronomeBpm}
      onMetronomeToggle={toggleMetronome}
    />

    {/* Main Content Area - unchanged */}
    <div className="flex-1 flex overflow-hidden">
      {/* Song list panel - unchanged */}

      {/* Main Stage */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* REMOVE: Old chart selector row */}

        {/* Content Viewer - updated AlphaTabRenderer */}
        <div className={cn(
          'flex-1 overflow-hidden bg-background',
          isGuitarPro ? 'p-0' : 'p-4 sm:p-6 overflow-y-auto'
        )}>
          {activeChart ? (
            <div className={cn('w-full h-full', !isGuitarPro && 'max-w-4xl mx-auto')}>
              {activeChart.type === 'GP' ? (
                <AlphaTabRenderer
                  fileData={activeChart.storageBase64 || activeChart.url!}
                  readOnly={false}
                  showControls={false}  // NEW: Hide built-in controls
                  showProgressBar={false}  // NEW: Hide built-in progress bar
                  onReady={handleAlphaTabReady}
                  onStateChange={handleAlphaTabStateChange}
                  onPositionChange={handleAlphaTabPositionChange}
                  onTracksLoaded={handleAlphaTabTracksLoaded}
                />
              ) : (
                // Other chart types unchanged
              )}
            </div>
          ) : (
            // No chart selected state unchanged
          )}
        </div>

        {/* Bottom Player Deck - unchanged for non-GP */}
      </div>
    </div>
  </div>
);
```

**Acceptance Criteria**:
- [ ] Old header completely removed
- [ ] Old chart selector row removed
- [ ] PracticeControlBar renders at top
- [ ] AlphaTabRenderer shows only score (no toolbar/progress)
- [ ] Play/pause controls work via control bar
- [ ] Track switching works via control bar
- [ ] BPM control works via control bar
- [ ] Chart tabs work to switch charts
- [ ] Total toolbar height ≤ 100px

---

### Task 3.3: Verify Layout Stability

**Description**: Ensure chart tabs don't shift when song list toggles
**Size**: Small
**Priority**: High
**Dependencies**: Task 3.2
**Can run parallel with**: None

**Technical Requirements**:
- Chart tabs must be center-justified
- Toggle button on left shouldn't affect center position
- Song list panel appearance/disappearance shouldn't shift tabs

**Verification Steps**:
1. Open Practice Room with song list visible
2. Note position of chart tabs
3. Toggle song list closed
4. Verify chart tabs remain in same position
5. Toggle song list open
6. Verify chart tabs remain stable

**Test Case**:

```typescript
describe('layout stability', () => {
  it('chart tabs do not shift when song list toggles', () => {
    const { rerender } = render(
      <PracticeControlBar {...defaultProps} showSongList={true} />
    );

    const tabsWithList = screen.getByTestId('chart-tabs');
    const rectWithList = tabsWithList.getBoundingClientRect();

    rerender(<PracticeControlBar {...defaultProps} showSongList={false} />);

    const tabsWithoutList = screen.getByTestId('chart-tabs');
    const rectWithoutList = tabsWithoutList.getBoundingClientRect();

    // Center position should remain stable
    const centerWithList = rectWithList.left + rectWithList.width / 2;
    const centerWithoutList = rectWithoutList.left + rectWithoutList.width / 2;

    // Allow 5px tolerance for sub-pixel differences
    expect(Math.abs(centerWithList - centerWithoutList)).toBeLessThan(5);
  });
});
```

**Acceptance Criteria**:
- [ ] Chart tabs remain centered when song list toggles
- [ ] No visible layout shift animation
- [ ] Toggle button position doesn't affect center content

---

## Phase 4: Design System Alignment

**Objective**: Apply typography, colors, and animations from the design system.

### Task 4.1: Typography Audit and Fixes

**Description**: Ensure all control bar text uses correct design system fonts
**Size**: Small
**Priority**: Medium
**Dependencies**: Phase 3 complete
**Can run parallel with**: Task 4.2, 4.3

**Requirements**:
- Song title: `font-serif` (Brawler)
- BPM/time displays: `font-mono tabular-nums` (JetBrains Mono)
- Labels: `font-sans` (Barlow)
- All numeric values should use `tabular-nums` for stable widths

**Verification Checklist**:
- [ ] Song title has `font-serif`
- [ ] BPM display has `font-mono tabular-nums`
- [ ] Current time has `font-mono tabular-nums`
- [ ] Total time has `font-mono tabular-nums`
- [ ] Slider labels have `font-mono tabular-nums`
- [ ] Track names use default sans-serif

---

### Task 4.2: Button and Tooltip Consistency

**Description**: Ensure all buttons use shadcn/ui Button and proper tooltip patterns
**Size**: Small
**Priority**: Medium
**Dependencies**: Phase 3 complete
**Can run parallel with**: Task 4.1, 4.3

**Requirements**:
- All icon buttons use Button component
- All buttons have Tooltip with TooltipProvider
- Active states use `--primary` color
- Disabled states properly styled
- Focus rings visible for keyboard navigation

**Verification Checklist**:
- [ ] Play/Pause uses Button
- [ ] Stop uses Button
- [ ] Loop uses Button
- [ ] Toggle uses Button
- [ ] All have proper focus-visible rings
- [ ] All use TooltipProvider

---

### Task 4.3: Animation and Motion

**Description**: Add appropriate animations respecting reduced-motion preferences
**Size**: Small
**Priority**: Low
**Dependencies**: Phase 3 complete
**Can run parallel with**: Task 4.1, 4.2

**Requirements**:
- Progress bar fill animates
- Metronome beats use scale transition
- All transitions have `motion-reduce:transition-none`
- Button hover transitions are subtle

**CSS to add/verify in index.css**:

```css
/* Progress bar fill animation */
@keyframes progress-fill {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

.animate-progress-fill {
  animation: progress-fill 300ms ease-out forwards;
  transform-origin: left;
}

/* Ensure all transitions respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .motion-reduce\:transition-none {
    transition: none !important;
  }
}
```

---

## Phase 5: Responsive Behavior

**Objective**: Ensure control bar works from 320px to desktop widths.

### Task 5.1: Define Breakpoint Behaviors

**Description**: Document and implement breakpoint-specific layouts
**Size**: Medium
**Priority**: Medium
**Dependencies**: Phase 4 complete
**Can run parallel with**: None

**Breakpoint Definitions**:
- Desktop (≥1024px): Full controls with labels
- Tablet (768-1023px): Icon buttons, tooltips essential
- Mobile (<768px): Overflow menu for secondary controls

**Implementation**:

```typescript
// Update PracticeControlBar for responsive behavior

// Desktop: show all controls inline
// Tablet: show icon buttons, hide labels
// Mobile: primary controls + overflow menu

<div className="flex items-center gap-4 px-4 py-2 h-14">
  {/* Left section - always visible */}
  <div className="flex items-center gap-3 min-w-0 shrink-0">
    {/* Toggle always visible */}
    {/* Song title hidden on mobile */}
    <div className="min-w-0 hidden sm:block">
      <h2>...</h2>
    </div>
  </div>

  {/* Center section */}
  <div className="flex-1 flex items-center justify-center gap-2 md:gap-4">
    {/* Playback controls always visible for GP */}
    {/* Chart tabs visible, but truncate on mobile */}
  </div>

  {/* Right section */}
  <div className="flex items-center gap-2 md:gap-3 shrink-0">
    {/* Desktop: all controls */}
    {/* Mobile: overflow menu */}
    <div className="hidden md:flex items-center gap-3">
      <TrackSelector ... />
      <TempoControl ... />
      <MetronomeIndicator ... />
    </div>

    {/* Mobile overflow menu */}
    <div className="md:hidden">
      <MobileControlsMenu
        tracks={tracks}
        currentTrackIndex={currentTrackIndex}
        // ... other props
      />
    </div>
  </div>
</div>
```

---

### Task 5.2: Create Mobile Controls Menu (if needed)

**Description**: Build overflow menu for mobile controls
**Size**: Medium
**Priority**: Low
**Dependencies**: Task 5.1
**Can run parallel with**: None

**Technical Requirements**:
- DropdownMenu containing secondary controls
- Track selector in menu
- Tempo slider in menu
- Metronome indicator always visible (small)

**Note**: This task may be deferred if the inline layout works acceptably on mobile.

---

### Task 5.3: Touch Target Verification

**Description**: Ensure all touch targets are at least 44px
**Size**: Small
**Priority**: Medium
**Dependencies**: Phase 4 complete
**Can run parallel with**: Task 5.1

**Requirements**:
- All buttons min height 44px on mobile
- Progress bar clickable area at least 44px tall
- Slider thumb at least 44px

**Test manually at 320px width**:
- [ ] Can tap play/pause easily
- [ ] Can tap stop easily
- [ ] Can tap loop easily
- [ ] Can tap chart tabs easily
- [ ] Can drag progress bar easily
- [ ] Can drag tempo slider easily

---

## Phase 6: Testing & Polish

**Objective**: Ensure comprehensive test coverage and final polish.

### Task 6.1: Unit Test Coverage

**Description**: Achieve ≥80% coverage for new practice components
**Size**: Large
**Priority**: High
**Dependencies**: All previous phases
**Can run parallel with**: Task 6.2, 6.3

**Test Files to Create**:
- `src/components/practice/PlaybackControls.test.tsx`
- `src/components/practice/ChartTabs.test.tsx`
- `src/components/practice/TrackSelector.test.tsx`
- `src/components/practice/TempoControl.test.tsx`
- `src/components/practice/MetronomeIndicator.test.tsx`
- `src/components/practice/ProgressBar.test.tsx`
- `src/components/practice/PracticeControlBar.test.tsx`

**Coverage Goals**:
- All components: ≥80% statement coverage
- All callbacks tested
- Edge cases (empty data, disabled states) tested

---

### Task 6.2: Integration Test Updates

**Description**: Update PracticeRoom tests for new structure
**Size**: Medium
**Priority**: High
**Dependencies**: Phase 3 complete
**Can run parallel with**: Task 6.1, 6.3

**Tests to Update/Add**:
- PracticeControlBar renders at top
- Old header elements no longer present
- AlphaTab controls work via control bar
- Chart switching works
- Non-GP metronome still works

---

### Task 6.3: Accessibility Audit

**Description**: Verify keyboard navigation and screen reader support
**Size**: Medium
**Priority**: Medium
**Dependencies**: All previous phases
**Can run parallel with**: Task 6.1, 6.2

**Checklist**:
- [ ] Tab navigation through all controls
- [ ] Space/Enter activates buttons
- [ ] Escape closes dropdowns
- [ ] All buttons have aria-labels
- [ ] Progress bar has role="slider" and aria attributes
- [ ] Screen reader announces control states
- [ ] No console errors during navigation

**Accessibility Test**:

```typescript
describe('accessibility', () => {
  it('passes axe-core audit', async () => {
    const { container } = render(
      <PracticeControlBar {...fullProps} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Tab navigates through controls', () => {
    render(<PracticeControlBar {...fullProps} />);

    const controls = [
      'toggle-button',
      'play-button', // or 'pause-button'
      'stop-button',
      'loop-button',
      // ... chart tabs
      'track-selector',
      'bpm-slider',
    ];

    controls.forEach((testId, index) => {
      if (index > 0) userEvent.tab();
      const element = screen.queryByTestId(testId);
      if (element) {
        expect(element).toHaveFocus();
      }
    });
  });
});
```

---

### Task 6.4: Final Polish and Documentation

**Description**: Fix any remaining issues and update documentation
**Size**: Small
**Priority**: Low
**Dependencies**: Tasks 6.1-6.3
**Can run parallel with**: None

**Tasks**:
- [ ] Fix any console errors
- [ ] Fix any TypeScript errors
- [ ] Verify ESLint passes
- [ ] Verify build succeeds
- [ ] Update CLAUDE.md with practice components
- [ ] Add README.md to practice folder (optional)

---

## Summary

### Total Tasks: 24

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 1 | 5 | AlphaTab API Extraction |
| Phase 2 | 7 | Unified Control Bar Components |
| Phase 3 | 3 | PracticeRoom Integration |
| Phase 4 | 3 | Design System Alignment |
| Phase 5 | 3 | Responsive Behavior |
| Phase 6 | 4 | Testing & Polish |

### Critical Path

```
Phase 1 (1.1 → 1.2 → 1.3 → 1.4)
    ↓
Phase 2 (2.1-2.6 parallel → 2.7)
    ↓
Phase 3 (3.1 → 3.2 → 3.3)
    ↓
Phase 4 (4.1-4.3 parallel)
    ↓
Phase 5 (5.1 → 5.2 → 5.3)
    ↓
Phase 6 (6.1-6.3 parallel → 6.4)
```

### Parallel Execution Opportunities

- **Phase 2**: Tasks 2.1-2.6 can run in parallel (all sub-components)
- **Phase 4**: Tasks 4.1-4.3 can run in parallel
- **Phase 6**: Tasks 6.1-6.3 can run in parallel

### Risk Areas

1. **AlphaTab API Volume Controls**: The volume control methods in AlphaTabHandle may need API verification
2. **Mobile Layout**: May need to defer MobileControlsMenu if inline layout works
3. **Test Mocking**: AlphaTab mocking complexity may require adjustments

---

*Document generated: 2025-11-27*
*Source: specs/feat-practice-room-unified-control-bar.md*
