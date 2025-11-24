# T-001: AlphaTab Player Enhancements

**Status**: COMPLETE
**Priority**: High
**Estimated Effort**: 6-8 hours
**Last Updated**: 2025-11-20

## Overview

Enhance the AlphaTab Guitar Pro file player with comprehensive transport controls, visual feedback during playback, and proper event handling. This will transform the player from basic play/pause functionality into a full-featured practice and performance tool.

## Current State

### Existing Implementation

- **File**: `/Users/jason/code/personal/band_assist/components/AlphaTabRenderer.tsx`
- **Library**: AlphaTab (loaded via CDN from `index.html:9`)
- **Current Features**:
  - ✅ Basic play/pause toggle
  - ✅ Playback speed control (50%-125%)
  - ✅ Track mute/solo/volume mixer
  - ✅ Auto-scrolling (configured via `scrollElement`)
  - ✅ Loading states and error handling
  - ✅ Retry mechanism on failures

### Current Limitations

- ❌ No stop/restart controls
- ❌ No visual progress indicator
- ❌ No seek/scrub capability
- ❌ No time display
- ❌ No section loop functionality
- ❌ No visual cursor highlighting (CSS missing)
- ❌ No beat/metronome visual feedback
- ❌ Limited event handling (only `playerStateChanged`, `scoreLoaded`, `error`)

## Technical Context

### AlphaTab Architecture

**What is AlphaTab?**
AlphaTab is a music notation rendering library that reads Guitar Pro files (.gp, .gp3, .gp4, .gp5, .gpx) and renders them as interactive, scrollable tablature with playback capabilities.

**Key Components**:

1. **AlphaTabApi** - Main API object (`window.alphaTab.AlphaTabApi`)
2. **Settings Object** - Configuration for rendering, playback, display
3. **Events** - Async notifications for state changes
4. **Player** - Audio playback engine with MIDI synthesis

**Data Flow**:

```
Guitar Pro File (Base64)
  → AlphaTab Parser
  → Score Object (tracks, beats, notes)
  → Renderer (SVG notation)
  → Player (MIDI synthesis)
  → Audio Output
```

**Event Model**:
AlphaTab uses an event-driven architecture. Events are registered with `.on()`:

```typescript
api.eventName.on(eventData => {
  // Handle event
});
```

Events fire asynchronously and may have slight latency due to audio buffering.

### Codebase Structure

**Project**: Band Assist (ZZ Top tribute band management tool)
**Framework**: React 19.2.0 with TypeScript + Vite
**Styling**: Tailwind CSS (via CDN)
**Icons**: Lucide React

**File Locations**:

- **Component**: `components/AlphaTabRenderer.tsx` (278 lines)
- **Usage**:
  - `components/SongDetail.tsx:548` - Song chart viewer (read-only)
  - `components/PracticeRoom.tsx:236` - Practice mode (playback enabled)
  - `components/PerformanceMode.tsx:196` - Live gig view (read-only)
- **Types**: `types.ts` - Shared TypeScript interfaces
- **Fonts**: `public/font/` - Bravura music notation fonts (local)

**Current AlphaTabRenderer Props**:

```typescript
interface AlphaTabRendererProps {
  fileData: string; // Base64 Data URI of .gp file
  isPlaying?: boolean; // External playback state control
  onPlaybackChange?: (isPlaying: boolean) => void; // Callback
  readOnly?: boolean; // Disables player when true
}
```

**Component State**:

- `loading` - Loading indicator
- `error` - Error message display
- `tracks` - Array of score tracks for mixer
- `currentSpeed` - Playback speed (0.5-1.25)
- `internalIsPlaying` - Internal play/pause state
- `showSettings` - Mixer panel visibility
- `retryKey` - Forces re-initialization on retry

**Key useEffect Hooks**:

1. Lines 59-207: AlphaTab initialization and cleanup
2. Lines 210-220: External playback state sync

### AlphaTab Configuration (Current)

```typescript
const settings = {
  core: {
    fontDirectory: '/font/', // Local Bravura fonts
    includeNoteBounds: false, // Performance optimization
    useWorkers: true, // Enable web workers
  },
  player: {
    enablePlayer: !readOnly, // Conditional based on prop
    soundFont: 'CDN_URL', // MIDI synthesizer samples
    scrollElement: rootRef.current, // Auto-scroll target
  },
  display: {
    layoutMode: 'page', // Vertical wrapping layout
    staveProfile: 'Default', // Standard notation display
  },
};
```

## Implementation Plan

### Phase 1: Transport Controls

#### 1.1 Stop Button

**Goal**: Add ability to stop playback and return to the beginning of the song.

**API Method**: `api.stop()`

- Stops playback completely
- Resets cursor to start position (or playback range start if set)
- Different from pause which maintains current position

**Implementation**:

**File**: `components/AlphaTabRenderer.tsx`

**Step 1**: Add stop handler function after existing `togglePlay` (around line 195):

```typescript
const stopPlayback = () => {
  if (apiRef.current) {
    apiRef.current.stop();
    setInternalIsPlaying(false);
    if (onPlaybackChange) onPlaybackChange(false);
  }
};
```

**Step 2**: Add Stop button to toolbar (around line 229):

```typescript
import { Play, Pause, Square, /* other icons */ } from 'lucide-react';

// In toolbar JSX:
<div className="flex items-center gap-2">
  <button
    onClick={togglePlay}
    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
      internalIsPlaying
        ? 'bg-amber-500 text-white'
        : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
    }`}
  >
    {internalIsPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
  </button>

  {/* NEW: Stop button */}
  <button
    onClick={stopPlayback}
    disabled={!internalIsPlaying && currentTime === 0}
    className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-200 hover:bg-zinc-300 text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    title="Stop and return to start"
  >
    <Square size={18} />
  </button>

  {/* Existing speed control... */}
</div>
```

**Testing**:

1. Play a song
2. Click Stop - should reset to beginning
3. Stop button should be disabled when already at start and not playing

---

#### 1.2 Progress Bar with Click-to-Seek

**Goal**: Add visual progress indicator and allow clicking to seek to any position.

**API Properties**:

- `api.timePosition` (read/write) - Current position in milliseconds
- `api.endTime` (read-only) - Total duration in milliseconds

**Implementation**:

**Step 1**: Add state for tracking position (after existing useState declarations):

```typescript
const [currentTime, setCurrentTime] = useState(0);
const [totalTime, setTotalTime] = useState(0);
```

**Step 2**: Register position change event (in the `initAlphaTab` function, after line 168):

```typescript
// Add after playerReady.on(...)
let lastPositionUpdate = 0;
api.playerPositionChanged.on((e: any) => {
  if (!isMounted) return;

  // Throttle updates to ~10 FPS for performance
  const now = Date.now();
  if (now - lastPositionUpdate < 100) return;
  lastPositionUpdate = now;

  setCurrentTime(e.currentTime);
  setTotalTime(e.endTime);
});

api.playerFinished.on(() => {
  if (!isMounted) return;
  console.log('[AlphaTab] Playback finished');
  setInternalIsPlaying(false);
  if (onPlaybackChange) onPlaybackChange(false);
});
```

**Step 3**: Add seek handler:

```typescript
const seekTo = (percentage: number) => {
  if (apiRef.current && totalTime > 0) {
    const targetTime = totalTime * percentage;
    apiRef.current.timePosition = targetTime;
  }
};
```

**Step 4**: Add progress bar UI (insert between toolbar and mixer overlay, around line 263):

```typescript
{/* Progress Bar */}
{!readOnly && totalTime > 0 && (
  <div className="bg-zinc-100 border-b border-zinc-300 px-4 py-2 flex items-center gap-3 shrink-0">
    <span className="text-xs font-mono text-zinc-600 w-12 text-right">
      {formatTime(currentTime)}
    </span>

    <div
      className="flex-1 h-2 bg-zinc-200 rounded-full cursor-pointer group relative"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        seekTo(percentage);
      }}
    >
      {/* Progress fill */}
      <div
        className="h-full bg-amber-500 rounded-full transition-all"
        style={{ width: `${(currentTime / totalTime) * 100}%` }}
      />

      {/* Hover scrubber */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-amber-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ left: `${(currentTime / totalTime) * 100}%` }}
      />
    </div>

    <span className="text-xs font-mono text-zinc-600 w-12">
      {formatTime(totalTime)}
    </span>
  </div>
)}
```

**Step 5**: Add time formatting helper (before component export):

```typescript
const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
```

**Testing**:

1. Play a song - progress bar should update smoothly
2. Click anywhere on progress bar - should seek to that position
3. Time displays should show current/total time
4. Progress bar should only show when player is enabled (`!readOnly`)

---

#### 1.3 Time Display

**Already implemented in 1.2 above** - Shows as "00:45 / 03:30" format on either side of progress bar.

---

#### 1.4 Section Loop

**Goal**: Allow users to select a specific range of measures and loop only that section.

**API Properties**:

- `api.playbackRange` (object with `startTick` and `endTick`)
- `api.isLooping` (boolean)

**Beat Object Properties**:

- `beat.absolutePlaybackStart` - Tick position where beat starts
- `beat.playbackDuration` - Duration of beat in ticks

**Implementation**:

**Step 1**: Add state for loop selection:

```typescript
const [isLooping, setIsLooping] = useState(false);
const [loopRange, setLoopRange] = useState<{ start: number; end: number } | null>(null);
const [selectionStart, setSelectionStart] = useState<number | null>(null);
```

**Step 2**: Add loop toggle and clear handlers:

```typescript
const toggleLoop = () => {
  if (apiRef.current) {
    const newLooping = !isLooping;
    apiRef.current.isLooping = newLooping;
    setIsLooping(newLooping);
  }
};

const clearLoopRange = () => {
  if (apiRef.current) {
    apiRef.current.playbackRange = null;
    setLoopRange(null);
    setSelectionStart(null);
  }
};
```

**Step 3**: Register beat click events (in `initAlphaTab`, after playerFinished.on):

```typescript
api.beatMouseDown.on((e: any) => {
  if (!isMounted) return;

  // Shift+Click to set loop range
  if (e.originalEvent.shiftKey) {
    const beatStart = e.beat.absolutePlaybackStart;
    const beatEnd = beatStart + e.beat.playbackDuration;

    if (selectionStart === null) {
      // First click - set start point
      setSelectionStart(beatStart);
      console.log('[AlphaTab] Loop start set:', beatStart);
    } else {
      // Second click - create range
      const startTick = Math.min(selectionStart, beatStart);
      const endTick = Math.max(selectionStart + e.beat.playbackDuration, beatEnd);

      apiRef.current.playbackRange = { startTick, endTick };
      setLoopRange({ start: startTick, end: endTick });
      setSelectionStart(null);

      console.log('[AlphaTab] Loop range set:', startTick, '-', endTick);
    }
  }
});
```

**Step 4**: Add loop controls to toolbar (near other playback buttons):

```typescript
import { Repeat, X } from 'lucide-react';

{/* Loop controls */}
<div className="flex items-center gap-1 ml-2">
  <button
    onClick={toggleLoop}
    className={`p-2 rounded transition-colors ${
      isLooping
        ? 'bg-amber-500 text-white'
        : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
    }`}
    title="Toggle loop"
  >
    <Repeat size={16} />
  </button>

  {loopRange && (
    <button
      onClick={clearLoopRange}
      className="p-2 rounded bg-zinc-200 hover:bg-red-200 text-zinc-700 hover:text-red-600 transition-colors"
      title="Clear loop range"
    >
      <X size={16} />
    </button>
  )}
</div>
```

**Step 5**: Add visual indicator for selection mode (in toolbar or above score):

```typescript
{selectionStart !== null && (
  <div className="bg-amber-100 border border-amber-400 text-amber-800 px-3 py-1 text-xs rounded animate-pulse">
    Loop start set - Shift+Click another measure to set end
  </div>
)}
```

**Testing**:

1. Shift+Click a measure - should show "Loop start set" message
2. Shift+Click another measure - should create loop range and hide message
3. Click Loop button - should enable looping of selected range
4. Click X button - should clear range
5. Loop range should highlight visually (via CSS - see Phase 2)

---

### Phase 2: Visual Feedback (CSS Styling)

#### 2.1 Cursor & Note Highlighting

**Goal**: Style the playback cursor and currently playing notes with project theme colors.

**How AlphaTab Works**:
AlphaTab automatically adds CSS classes to elements during playback:

- `.at-cursor-bar` - The currently playing bar/measure
- `.at-cursor-beat` - Vertical line showing exact beat position
- `.at-highlight` - Currently playing notes/symbols
- `.at-selection` - Selected loop range

**Implementation**:

**Step 1**: Create CSS file for AlphaTab styles:

**File**: `public/alphatab-custom.css` (new file)

```css
/**
 * AlphaTab Custom Styles
 * Band Assist - Guitar Pro Player
 */

/* Currently playing bar - subtle amber highlight */
.at-cursor-bar {
  background: rgba(245, 158, 11, 0.12) !important; /* Amber-500 at 12% opacity */
}

/* Beat cursor - vertical line showing exact playback position */
.at-cursor-beat {
  background: rgba(245, 158, 11, 0.85) !important; /* Solid amber */
  width: 3px !important;
  border-radius: 1px;
  box-shadow: 0 0 4px rgba(245, 158, 11, 0.5);
}

/* Currently playing notes - highlighted in amber */
.at-highlight * {
  fill: #f59e0b !important; /* Amber-500 */
  stroke: #f59e0b !important;
  stroke-width: 1.5 !important;
}

/* Loop range selection - light amber overlay */
.at-selection div {
  background: rgba(245, 158, 11, 0.08) !important;
  border: 1px dashed rgba(245, 158, 11, 0.4);
}

/* Hover effect on beats (for loop selection) */
.at-surface .at-beat:hover {
  cursor: pointer;
  opacity: 0.8;
}
```

**Step 2**: Link CSS in `index.html` (after Tailwind, before closing `</head>`):

```html
<link rel="stylesheet" href="/alphatab-custom.css" />
```

**Testing**:

1. Play a song - should see amber vertical line moving across measures
2. Currently playing bar should have subtle amber background
3. Notes should highlight in amber as they're played
4. Loop selection should show amber dashed border

---

#### 2.2 Auto-Scroll Verification

**Already Implemented** - Just needs testing validation.

**Current Configuration**:

```typescript
scrollElement: rootRef.current; // Line 117
```

**Testing Checklist**:

- [ ] Play a song and verify view scrolls to keep cursor visible
- [ ] Scroll manually while playing - should auto-scroll continue or respect manual scroll?
- [ ] Test on long songs (10+ minutes) - performance check

**Optional Enhancement** (if auto-scroll behavior needs improvement):
Add scroll mode configuration:

```typescript
// In settings object:
player: {
  // ... existing settings
  scrollMode: 0,  // 0 = Off, 1 = Continuous (default), 2 = OffScreen
  scrollSpeed: 300  // Animation speed in ms
}
```

---

#### 2.3 Visual Metronome

**Goal**: Show a visual beat indicator that flashes in sync with the metronome.

**API Event**: `api.midiEventsPlayed` with metronome filter

**Implementation**:

**Step 1**: Add state for metronome beat tracking:

```typescript
const [metronomeBeat, setMetronomeBeat] = useState<number>(0);
const [metronomeDuration, setMetronomeDuration] = useState<number>(0);
```

**Step 2**: Configure and register metronome event (in `initAlphaTab`, after beatMouseDown):

```typescript
// Configure to only listen for metronome events (performance)
api.midiEventsPlayedFilter = [window.alphaTab.midi.MidiEventType.AlphaTabMetronome];

api.midiEventsPlayed.on((e: any) => {
  if (!isMounted) return;

  for (const midi of e.events) {
    if (midi.isMetronome) {
      setMetronomeBeat(midi.metronomeNumerator); // 1-4 for 4/4 time
      setMetronomeDuration(midi.metronomeDurationInMilliseconds);

      // Auto-clear highlight after beat duration
      setTimeout(() => {
        if (isMounted) setMetronomeBeat(0);
      }, midi.metronomeDurationInMilliseconds * 0.3);
    }
  }
});
```

**Step 3**: Add visual metronome UI (in toolbar, near tempo display):

```typescript
{!readOnly && (
  <div className="flex items-center gap-1 bg-zinc-200 rounded px-2 py-1 ml-2">
    <Activity size={14} className="text-zinc-500" />
    <div className="flex gap-1">
      {[1, 2, 3, 4].map((beat) => (
        <div
          key={beat}
          className={`w-2 h-2 rounded-full transition-all duration-75 ${
            metronomeBeat === beat
              ? 'bg-amber-500 scale-150'
              : 'bg-zinc-400 scale-100'
          }`}
        />
      ))}
    </div>
  </div>
)}
```

**Testing**:

1. Play a song - dots should flash in sequence (1-2-3-4)
2. First beat should be emphasized (larger/brighter)
3. Flash should sync with audio metronome click
4. Works with different time signatures (3/4, 6/8, etc.)

**Known Limitation**: There's ~50-200ms latency between visual flash and audio due to audio buffering. This is normal behavior in AlphaTab.

---

#### 2.4 Progress Indicator

**Already implemented in Phase 1.2** - The progress bar serves as the visual progress indicator.

---

### Phase 3: Event Handler Integration

All event handlers are implemented in their respective features above. Summary:

#### 3.1 Position Updates

- **Event**: `playerPositionChanged`
- **Purpose**: Track playback position for progress bar
- **Throttling**: 100ms (~10 FPS) for performance
- **Location**: Phase 1.2, Step 2

#### 3.2 Playback Finished

- **Event**: `playerFinished`
- **Purpose**: Reset UI when song ends
- **Actions**: Stop playback state, optionally auto-advance to next song
- **Location**: Phase 1.2, Step 2

#### 3.3 Beat Changes

- **Event**: `midiEventsPlayed` (filtered for metronome)
- **Purpose**: Visual metronome indicator
- **Location**: Phase 2.3, Step 2

---

## Complete Code Reference

### Final AlphaTabRenderer Structure

```typescript
// File: components/AlphaTabRenderer.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
  Play, Pause, Square, Sliders, Layers, Activity,
  Music2, AlertTriangle, Repeat, X
} from 'lucide-react';

// ... existing interface and component setup ...

export const AlphaTabRenderer: React.FC<AlphaTabRendererProps> = ({
  fileData,
  isPlaying: externalIsPlaying,
  onPlaybackChange,
  readOnly = false
}) => {
  // Existing state
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState(1.0);
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // NEW: Phase 1 - Transport controls state
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [loopRange, setLoopRange] = useState<{start: number, end: number} | null>(null);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);

  // NEW: Phase 2 - Visual feedback state
  const [metronomeBeat, setMetronomeBeat] = useState<number>(0);

  // Existing helpers
  const prepareData = (uri: string): Uint8Array | null => { /* ... */ };

  // Existing event handlers
  const togglePlay = () => { /* ... */ };
  const changeSpeed = (val: number) => { /* ... */ };
  const renderTrack = (track: any) => { /* ... */ };
  const toggleTrackMute = (track: any) => { /* ... */ };
  const toggleTrackSolo = (track: any) => { /* ... */ };

  // NEW: Transport control handlers
  const stopPlayback = () => {
    if (apiRef.current) {
      apiRef.current.stop();
      setInternalIsPlaying(false);
      if (onPlaybackChange) onPlaybackChange(false);
    }
  };

  const seekTo = (percentage: number) => {
    if (apiRef.current && totalTime > 0) {
      const targetTime = totalTime * percentage;
      apiRef.current.timePosition = targetTime;
    }
  };

  const toggleLoop = () => {
    if (apiRef.current) {
      const newLooping = !isLooping;
      apiRef.current.isLooping = newLooping;
      setIsLooping(newLooping);
    }
  };

  const clearLoopRange = () => {
    if (apiRef.current) {
      apiRef.current.playbackRange = null;
      setLoopRange(null);
      setSelectionStart(null);
    }
  };

  // Helper
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Main initialization effect (modified)
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let checkAttempts = 0;
    let lastPositionUpdate = 0;

    const checkLibrary = () => { /* ... existing code ... */ };

    const initAlphaTab = () => {
      if (!containerRef.current || !isMounted) return;

      // Cleanup and settings - existing code ...

      try {
        // Initialize API - existing code ...
        const api = new window.alphaTab.AlphaTabApi(containerRef.current, settings);
        apiRef.current = api;

        // Existing event handlers
        api.scoreLoaded.on(/* ... */);
        api.error.on(/* ... */);
        api.playerStateChanged.on(/* ... */);
        api.playerReady.on(/* ... */);
        api.renderStarted.on(/* ... */);
        api.renderFinished.on(/* ... */);

        // NEW: Position tracking
        api.playerPositionChanged.on((e: any) => {
          if (!isMounted) return;
          const now = Date.now();
          if (now - lastPositionUpdate < 100) return;
          lastPositionUpdate = now;

          setCurrentTime(e.currentTime);
          setTotalTime(e.endTime);
        });

        // NEW: Playback finished
        api.playerFinished.on(() => {
          if (!isMounted) return;
          console.log("[AlphaTab] Playback finished");
          setInternalIsPlaying(false);
          if (onPlaybackChange) onPlaybackChange(false);
        });

        // NEW: Beat selection for loop
        api.beatMouseDown.on((e: any) => {
          if (!isMounted) return;

          if (e.originalEvent.shiftKey) {
            const beatStart = e.beat.absolutePlaybackStart;
            const beatEnd = beatStart + e.beat.playbackDuration;

            if (selectionStart === null) {
              setSelectionStart(beatStart);
            } else {
              const startTick = Math.min(selectionStart, beatStart);
              const endTick = Math.max(selectionStart + e.beat.playbackDuration, beatEnd);

              apiRef.current.playbackRange = { startTick, endTick };
              setLoopRange({ start: startTick, end: endTick });
              setSelectionStart(null);
            }
          }
        });

        // NEW: Visual metronome
        api.midiEventsPlayedFilter = [
          window.alphaTab.midi.MidiEventType.AlphaTabMetronome
        ];

        api.midiEventsPlayed.on((e: any) => {
          if (!isMounted) return;

          for (const midi of e.events) {
            if (midi.isMetronome) {
              setMetronomeBeat(midi.metronomeNumerator);

              setTimeout(() => {
                if (isMounted) setMetronomeBeat(0);
              }, midi.metronomeDurationInMilliseconds * 0.3);
            }
          }
        });

        // Load data - existing code ...
      } catch (e: any) {
        // Error handling - existing code ...
      }
    };

    checkLibrary();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (apiRef.current) {
        try {
          apiRef.current.destroy();
        } catch (e) {
          console.error("[AlphaTab] Error during cleanup", e);
        }
      }
    };
  }, [fileData, readOnly, retryKey]);

  // External playback sync - existing code ...

  return (
    <div className="flex flex-col h-full bg-white text-black rounded-xl overflow-hidden relative border border-zinc-200">
      {/* Toolbar with NEW controls */}
      <div className="bg-zinc-100 border-b border-zinc-300 p-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {!readOnly && (
            <>
              {/* Play/Pause */}
              <button onClick={togglePlay} /* ... existing code ... */>
                {internalIsPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
              </button>

              {/* NEW: Stop */}
              <button
                onClick={stopPlayback}
                disabled={!internalIsPlaying && currentTime === 0}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-200 hover:bg-zinc-300 text-zinc-700 disabled:opacity-30 transition-colors"
                title="Stop"
              >
                <Square size={18} />
              </button>
            </>
          )}

          {/* Speed control - existing */}
          <div className="flex items-center gap-1 bg-zinc-200 rounded px-2 py-1">
            {/* ... existing speed selector ... */}
          </div>

          {/* NEW: Loop controls */}
          {!readOnly && (
            <div className="flex items-center gap-1">
              <button
                onClick={toggleLoop}
                className={`p-2 rounded transition-colors ${
                  isLooping ? 'bg-amber-500 text-white' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                }`}
                title="Toggle loop"
              >
                <Repeat size={16} />
              </button>

              {loopRange && (
                <button
                  onClick={clearLoopRange}
                  className="p-2 rounded bg-zinc-200 hover:bg-red-200 text-zinc-700 hover:text-red-600 transition-colors"
                  title="Clear loop"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}

          {/* NEW: Visual metronome */}
          {!readOnly && (
            <div className="flex items-center gap-1 bg-zinc-200 rounded px-2 py-1">
              <Activity size={14} className="text-zinc-500" />
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((beat) => (
                  <div
                    key={beat}
                    className={`w-2 h-2 rounded-full transition-all duration-75 ${
                      metronomeBeat === beat ? 'bg-amber-500 scale-150' : 'bg-zinc-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mixer toggle - existing */}
        <div className="flex items-center gap-2">
          {/* ... existing mixer button ... */}
        </div>
      </div>

      {/* NEW: Progress bar */}
      {!readOnly && totalTime > 0 && (
        <div className="bg-zinc-100 border-b border-zinc-300 px-4 py-2 flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono text-zinc-600 w-12 text-right">
            {formatTime(currentTime)}
          </span>

          <div
            className="flex-1 h-2 bg-zinc-200 rounded-full cursor-pointer group relative"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percentage = Math.max(0, Math.min(1, x / rect.width));
              seekTo(percentage);
            }}
          >
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${(currentTime / totalTime) * 100}%` }}
            />

            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-amber-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `${(currentTime / totalTime) * 100}%` }}
            />
          </div>

          <span className="text-xs font-mono text-zinc-600 w-12">
            {formatTime(totalTime)}
          </span>
        </div>
      )}

      {/* NEW: Loop selection hint */}
      {selectionStart !== null && (
        <div className="bg-amber-100 border-b border-amber-400 text-amber-800 px-3 py-1 text-xs">
          Loop start set - Shift+Click another measure to set end
        </div>
      )}

      {/* Mixer overlay - existing */}
      {showSettings && (
        <div className="absolute top-14 right-2 z-20 /* ... existing code ... */">
          {/* ... existing mixer UI ... */}
        </div>
      )}

      {/* Render area - existing */}
      <div ref={rootRef} className="flex-1 overflow-auto relative bg-white">
        {loading && (/* ... existing loading UI ... */)}
        {error && (/* ... existing error UI ... */)}
        <div ref={containerRef} className="min-h-full" />
      </div>
    </div>
  );
};
```

---

## Testing Plan

### Unit Testing Checklist

**Transport Controls**:

- [ ] Stop button resets to start
- [ ] Stop button disabled when appropriate
- [ ] Progress bar updates during playback
- [ ] Click-to-seek works accurately
- [ ] Time displays format correctly (00:00)
- [ ] Loop toggle enables/disables looping
- [ ] Shift+Click selects loop range
- [ ] Clear loop button removes range
- [ ] Loop range persists across play/pause

**Visual Feedback**:

- [ ] Cursor bar highlights current measure
- [ ] Beat cursor shows exact position
- [ ] Notes highlight while playing
- [ ] Loop selection shows amber overlay
- [ ] Metronome dots flash in sync
- [ ] Auto-scroll keeps cursor visible
- [ ] Styling matches project theme (amber)

**Event Handlers**:

- [ ] Position updates fire ~10x/second
- [ ] Finished event resets play state
- [ ] Beat events sync with metronome
- [ ] No memory leaks after unmount

### Integration Testing

**Practice Room** (`components/PracticeRoom.tsx`):

- [ ] All controls visible and functional
- [ ] Loop mode useful for practicing sections
- [ ] Visual metronome helps with timing
- [ ] Progress bar shows position in song

**Song Detail** (`components/SongDetail.tsx`):

- [ ] Read-only mode hides player controls correctly
- [ ] Page layout renders properly
- [ ] No conflicts with AI chat sidebar

**Performance Mode** (`components/PerformanceMode.tsx`):

- [ ] Read-only mode works
- [ ] No unnecessary controls shown
- [ ] Fullscreen layout unaffected

### Performance Testing

- [ ] Throttling prevents UI lag (100ms position updates)
- [ ] Long songs (10+ min) don't degrade performance
- [ ] Multiple file switches don't leak memory
- [ ] Metronome visual updates don't cause jank

---

## Known Issues & Limitations

1. **MIDI Event Latency**: Visual metronome has ~50-200ms latency vs. audio due to buffering. This is expected AlphaTab behavior.

2. **Time Signature Changes**: Visual metronome shows 4 beats always. May need enhancement for 3/4, 6/8, etc.

3. **Loop Selection UX**: Shift+Click is not discoverable. Consider adding:
   - Tooltip on first visit
   - "Set Loop" button that enters selection mode
   - Visual feedback when Shift is held

4. **Progress Bar Precision**: On very long songs, click-to-seek may be imprecise. Consider adding:
   - Zoom on hover
   - Input field for exact time entry

5. **Auto-Scroll Configuration**: Currently uses default scroll mode. May want to expose in settings:
   - Off / Continuous / OffScreen modes
   - Scroll speed adjustment

---

## Future Enhancements (Out of Scope)

These features were identified but not included in this ticket:

1. **Count-In Volume Control** - Separate slider for count-in metronome
2. **Skip ±10s Buttons** - Quick jump forward/backward
3. **Master Volume Slider** - Overall playback volume control
4. **Click-to-Play Beat** - Click any beat to preview its sound
5. **Keyboard Shortcuts** - Space = play/pause, arrows = seek, etc.
6. **A-B Repeat** - Set two markers for precise loop boundaries
7. **Tempo Override** - Practice at different BPM than original
8. **Multiple Loop Slots** - Save multiple loop ranges
9. **Practice Mode Analytics** - Track which sections practiced most

Consider creating follow-up tickets for high-value items.

---

## Resources

### AlphaTab Documentation

- Main Site: <https://alphatab.net>
- API Reference: <https://alphatab.net/docs/reference/api>
- Player Settings: <https://alphatab.net/docs/reference/settings/player>
- Events: <https://alphatab.net/docs/reference/events>

### Project Documentation

- Project Wiki: See `docs/wiki/` directory
- Types Reference: `types.ts`
- Component Patterns: Review existing components for consistency

### Dependencies

- **AlphaTab**: Loaded via CDN in `index.html:9`
- **React**: 19.2.0
- **TypeScript**: ~5.8.2
- **Lucide Icons**: <https://lucide.dev/icons>
- **Tailwind**: <https://tailwindcss.com>

---

## Implementation Notes

### Code Style

- Use TypeScript strict mode
- Follow existing component patterns
- Maintain consistent naming (camelCase for functions, PascalCase for components)
- Add JSDoc comments for complex functions
- Keep handlers grouped together

### Error Handling

- All AlphaTab API calls should check `if (apiRef.current)` first
- Event handlers should check `if (!isMounted)` to prevent state updates after unmount
- Log significant events with `[AlphaTab]` prefix for debugging

### Performance

- Throttle high-frequency events (position updates, metronome)
- Use React.memo() if component re-renders become issue
- Clean up event listeners in useEffect cleanup
- Avoid inline function creation in JSX where possible

### Accessibility

- Add `title` attributes to all buttons
- Use semantic HTML (button, not div with onClick)
- Ensure keyboard navigation works
- Add ARIA labels where appropriate

---

## Acceptance Criteria

This ticket is complete when:

1. ✅ All transport controls implemented and functional
2. ✅ Visual feedback CSS applied and visible during playback
3. ✅ Event handlers registered and updating UI correctly
4. ✅ All testing checklist items pass
5. ✅ No console errors or warnings
6. ✅ Code reviewed and approved
7. ✅ Works in Practice Room, Song Detail, and Performance Mode
8. ✅ Performance is acceptable (no lag, smooth animations)
9. ✅ Documentation updated (if needed)

---

**End of Implementation Plan**
