# Task Breakdown: AlphaTab Infrastructure Modernization

Generated: 2025-11-27
Source: specs/infra-alphatab-modernization.md

## Overview

This task breakdown covers modernizing the AlphaTab integration from CDN-based script loading to a proper Vite-bundled ESM module, plus exposing additional player controls (track volume, master volume, metronome volume, count-in).

**Current State:**
- AlphaTab loaded via CDN with `@latest` tag
- npm package installed for TypeScript types only
- Runtime code loaded from external CDN
- No volume controls beyond mute/solo

**Target State:**
- AlphaTab bundled via Vite plugin
- Pinned version from package.json
- Local fonts and soundfont
- Full volume controls API

---

## Phase 1: Vite Plugin Setup

### Task 1.1: Add AlphaTab Vite Plugin to Configuration

**Description**: Configure the AlphaTab Vite plugin in vite.config.ts for proper ESM bundling and asset management
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: None (foundation task)

**Source**: specs/infra-alphatab-modernization.md Section 5.1

**Technical Requirements**:
- Import the AlphaTab Vite plugin from `@coderline/alphatab/vite`
- Add plugin to Vite configuration
- Plugin automatically copies fonts to `/font` and soundfont to `/soundfont`

**Implementation**:

```typescript
// vite.config.ts - Updated configuration
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { alphaTab } from '@coderline/alphatab/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      tailwindcss(),
      alphaTab({
        // Use default asset paths:
        // - Fonts copied to /font
        // - Soundfont copied to /soundfont
      }),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
```

**Acceptance Criteria**:
- [ ] Vite plugin imported and configured
- [ ] `npm run build` succeeds
- [ ] `dist/font/` contains Bravura fonts after build
- [ ] `dist/soundfont/` contains sonivox.sf2 after build
- [ ] Dev server starts without errors
- [ ] No TypeScript errors in vite.config.ts

---

### Task 1.2: Verify Plugin Build Output

**Description**: Run production build and verify Vite plugin correctly copies AlphaTab assets
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: None

**Technical Requirements**:
- Run `npm run build`
- Verify font files in dist/font/
- Verify soundfont file in dist/soundfont/
- Verify no build errors

**Implementation Steps**:

1. Run production build:
```bash
npm run build
```

2. Check font directory:
```bash
ls -la dist/font/
# Should contain Bravura fonts (woff, woff2 files)
```

3. Check soundfont directory:
```bash
ls -la dist/soundfont/
# Should contain sonivox.sf2
```

4. Verify build success in terminal output

**Acceptance Criteria**:
- [ ] Build completes without errors
- [ ] `dist/font/` directory exists and contains font files
- [ ] `dist/soundfont/` directory exists and contains sonivox.sf2
- [ ] Build time increase is acceptable (< 10s additional)
- [ ] No duplicate font files in public/ and dist/font/

---

## Phase 2: ESM Migration

### Task 2.1: Convert AlphaTabRenderer to ESM Imports

**Description**: Replace window.alphaTab global access with proper ESM imports from @coderline/alphatab
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 2.2

**Source**: specs/infra-alphatab-modernization.md Section 5.3

**Technical Requirements**:
- Import AlphaTabApi and midi from @coderline/alphatab
- Remove window.alphaTab global type declaration
- Remove CDN availability check loop
- Update settings to use local asset paths
- Maintain all existing functionality

**Current Code (to be replaced)**:

```typescript
// Current: Relies on window.alphaTab from CDN

// Extend window interface to include alphaTab from CDN
declare global {
  interface Window {
    alphaTab: {
      AlphaTabApi: new (element: HTMLElement, settings: AlphaTabSettings) => AlphaTabApi;
      midi: {
        MidiEventType: {
          AlphaTabMetronome: number;
        };
      };
    };
  }
}

// In initAlphaTab:
const api = new window.alphaTab.AlphaTabApi(element, settings);

// CDN check loop:
const checkLibrary = () => {
  checkAttempts++;
  if (!window.alphaTab) {
    if (checkAttempts >= MAX_CHECK_ATTEMPTS) {
      // error handling
    }
    setTimeout(checkLibrary, 200);
    return;
  }
  initAlphaTab();
};
```

**New Code (implementation)**:

```typescript
// src/components/AlphaTabRenderer.tsx - Top of file
import { AlphaTabApi, midi } from '@coderline/alphatab';
import type { AlphaTabApi as AlphaTabApiType } from '@coderline/alphatab';

// Remove the 'declare global' block entirely

// In useEffect initialization:
useEffect(() => {
  let isMounted = true;
  let timeoutId: NodeJS.Timeout;

  // Capture ref value at effect start for cleanup
  const metronomeTimeouts = metronomeTimeoutsRef.current;

  // Direct initialization - no CDN check needed
  const initAlphaTab = () => {
    if (!containerRef.current || !isMounted) return;

    // Cleanup existing
    if (apiRef.current) {
      try {
        apiRef.current.destroy();
      } catch (e) {
        console.error('[AlphaTab] Error destroying previous instance', e);
      }
      apiRef.current = null;
    }

    setLoading(true);
    setError(null);
    setPlayerReady(false);

    // Set a timeout for loading
    timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        setError(
          'Loading timeout. The file may be too large, corrupted, or incompatible.'
        );
        setLoading(false);
      }
    }, 15000);

    try {
      const settings = {
        core: {
          fontDirectory: '/font/', // Vite plugin copies fonts here
          includeNoteBounds: false,
          useWorkers: true,
        },
        player: {
          enablePlayer: !readOnly,
          soundFont: '/soundfont/sonivox.sf2', // Local after Vite plugin copies it
          scrollElement: rootRef.current,
        },
        display: {
          layoutMode: 'page',
          staveProfile: 'Default',
        },
      };

      // Direct ESM instantiation
      const api = new AlphaTabApi(containerRef.current, settings);
      apiRef.current = api;

      // ... rest of event handler registration (unchanged)
    } catch (e: unknown) {
      // ... error handling (unchanged)
    }
  };

  // Direct call - no checkLibrary loop
  initAlphaTab();

  return () => {
    // ... cleanup (unchanged)
  };
}, [fileData, readOnly, retryKey]);

// Update midiEventsPlayedFilter to use ESM import:
api.midiEventsPlayedFilter = [midi.MidiEventType.AlphaTabMetronome];
```

**Key Changes Summary**:
1. Add import at top: `import { AlphaTabApi, midi } from '@coderline/alphatab';`
2. Remove entire `declare global { interface Window { alphaTab: ... } }` block
3. Remove `checkLibrary()` function and related variables
4. Change `new window.alphaTab.AlphaTabApi(...)` to `new AlphaTabApi(...)`
5. Change `window.alphaTab.midi.MidiEventType.AlphaTabMetronome` to `midi.MidiEventType.AlphaTabMetronome`
6. Update soundFont path from CDN URL to `/soundfont/sonivox.sf2`
7. Call `initAlphaTab()` directly instead of `checkLibrary()`

**Acceptance Criteria**:
- [ ] ESM imports compile without TypeScript errors
- [ ] No `window.alphaTab` references remain in code
- [ ] AlphaTabRenderer loads without errors
- [ ] Guitar Pro files render correctly
- [ ] Playback works with local soundfont
- [ ] Workers function correctly (check DevTools Network tab)
- [ ] All existing tests pass (after test mock updates)

---

### Task 2.2: Remove CDN Script from index.html

**Description**: Remove the AlphaTab CDN script tag from index.html
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 2.1

**Source**: specs/infra-alphatab-modernization.md Section 5.2

**Technical Requirements**:
- Remove AlphaTab CDN script tag
- Keep all other content unchanged
- Verify no other files reference the CDN URL

**Current Code (to be removed)**:

```html
<!-- index.html - Line 12-13 -->
<!-- AlphaTab for Guitar Pro files -->
<script src="https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.js"></script>
```

**After (remove both lines above)**:
The entire script tag and comment should be removed.

**Verification Steps**:
1. Search codebase for CDN references:
```bash
grep -r "cdn.jsdelivr.net/npm/@coderline/alphatab" .
# Should only find this task file and spec, not any source files
```

2. Ensure soundFont CDN URL in AlphaTabRenderer.tsx is also updated (covered in Task 2.1)

**Acceptance Criteria**:
- [ ] CDN script tag removed from index.html
- [ ] No CDN references in source code (except documentation)
- [ ] Application starts successfully without CDN
- [ ] No network requests to jsdelivr for AlphaTab

---

### Task 2.3: Update Test Mocking Strategy

**Description**: Migrate test mocks from window.alphaTab to ESM module mocks using vi.mock
**Size**: Medium
**Priority**: High
**Dependencies**: Task 2.1
**Can run parallel with**: None

**Source**: specs/infra-alphatab-modernization.md Section 7

**Technical Requirements**:
- Use vi.mock for ESM imports instead of window.alphaTab
- Mock must be hoisted to top of test file
- Add new volume properties to mock for Phase 3
- Preserve all existing mock functionality

**Current Test Code (to be replaced)**:

```typescript
// src/components/AlphaTabRenderer.test.tsx - Current beforeEach
beforeEach(() => {
  vi.clearAllMocks();
  MockAlphaTabApi.mockClear();
  mockApiInstance.isLooping = false;
  mockApiInstance.playbackRange = null;

  // Setup window.alphaTab mock
  type AlphaTabConstructor = new (
    element: HTMLElement,
    settings: unknown
  ) => typeof mockApiInstance;

  window.alphaTab = {
    AlphaTabApi: MockAlphaTabApi as unknown as AlphaTabConstructor,
    midi: {
      MidiEventType: {
        AlphaTabMetronome: 1,
      },
    },
  };
});
```

**New Test Code (implementation)**:

```typescript
// src/components/AlphaTabRenderer.test.tsx - Full updated file

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

// Mock must be hoisted - place BEFORE component import
vi.mock('@coderline/alphatab', () => ({
  AlphaTabApi: vi.fn().mockImplementation(() => mockApiInstance),
  midi: {
    MidiEventType: {
      AlphaTabMetronome: 1,
    },
  },
}));

// Import component AFTER mock setup
import { AlphaTabRenderer } from './AlphaTabRenderer';

interface MockTrack {
  name: string;
  playbackInfo: {
    isMute: boolean;
    isSolo: boolean;
  };
  // NEW: Add volume for Phase 3
  volume?: number;
}

// Mock AlphaTab API instance with all required properties
const mockApiInstance = {
  destroy: vi.fn(),
  load: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  playPause: vi.fn(),
  stop: vi.fn(),
  renderTracks: vi.fn(),
  changeTrackMute: vi.fn(),
  changeTrackSolo: vi.fn(),
  // NEW: Add volume control methods for Phase 3
  changeTrackVolume: vi.fn(),
  playbackSpeed: 1.0,
  timePosition: 0,
  isLooping: false,
  playbackRange: null,
  // NEW: Add volume properties for Phase 3
  masterVolume: 1.0,
  metronomeVolume: 0,
  countInVolume: 0,
  score: {
    tracks: [] as MockTrack[],
    tempo: 120,
  },
  scoreLoaded: { on: vi.fn(), off: vi.fn() },
  error: { on: vi.fn(), off: vi.fn() },
  playerStateChanged: { on: vi.fn(), off: vi.fn() },
  playerReady: { on: vi.fn(), off: vi.fn() },
  renderStarted: { on: vi.fn(), off: vi.fn() },
  renderFinished: { on: vi.fn(), off: vi.fn() },
  playerPositionChanged: { on: vi.fn(), off: vi.fn() },
  playerFinished: { on: vi.fn(), off: vi.fn() },
  beatMouseDown: { on: vi.fn(), off: vi.fn() },
  midiEventsPlayed: { on: vi.fn(), off: vi.fn() },
  midiEventsPlayedFilter: [],
};

// Get reference to mocked constructor for assertions
const MockAlphaTabApi = vi.mocked(
  (await import('@coderline/alphatab')).AlphaTabApi
);

describe('AlphaTabRenderer', () => {
  const mockFileData = 'data:application/octet-stream;base64,VEVTVERBVEE=';

  beforeEach(() => {
    vi.clearAllMocks();
    MockAlphaTabApi.mockClear();
    mockApiInstance.isLooping = false;
    mockApiInstance.playbackRange = null;
    // Reset volume properties
    mockApiInstance.masterVolume = 1.0;
    mockApiInstance.metronomeVolume = 0;
    mockApiInstance.countInVolume = 0;

    // NO window.alphaTab setup - ESM mock handles everything
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ... rest of tests unchanged, but remove any window.alphaTab references
});
```

**Key Changes Summary**:
1. Add `vi.mock('@coderline/alphatab', ...)` BEFORE component import
2. Remove all `window.alphaTab = ...` assignments
3. Add volume properties to mock: `masterVolume`, `metronomeVolume`, `countInVolume`, `changeTrackVolume`
4. Reset volume properties in beforeEach
5. Use `vi.mocked()` to get typed reference to mocked constructor

**Acceptance Criteria**:
- [ ] All existing tests pass with ESM mocks
- [ ] No `window.alphaTab` references in test file
- [ ] Mock includes volume properties for Phase 3
- [ ] vi.mock is hoisted before component import
- [ ] TypeScript compiles test file without errors

---

### Task 2.4: Integration Verification

**Description**: Verify complete ESM integration works end-to-end
**Size**: Small
**Priority**: High
**Dependencies**: Task 2.1, Task 2.2, Task 2.3
**Can run parallel with**: None

**Technical Requirements**:
- Run full test suite
- Test dev server with Guitar Pro file
- Test production build
- Verify no CDN requests

**Verification Steps**:

1. Run test suite:
```bash
npm test
```

2. Run type check:
```bash
npm run typecheck
```

3. Start dev server and test:
```bash
npm run dev
# Navigate to a song with Guitar Pro file
# Verify rendering and playback work
# Check DevTools Network tab - no jsdelivr requests
```

4. Build and preview:
```bash
npm run build
npm run preview
# Test same functionality
```

5. Check for CDN requests in DevTools:
- Open Network tab
- Filter by "jsdelivr" or "alphatab"
- Should only see local asset requests

**Acceptance Criteria**:
- [ ] `npm test` passes all tests
- [ ] `npm run typecheck` passes
- [ ] Guitar Pro files render in dev mode
- [ ] Playback works in dev mode
- [ ] Production build succeeds
- [ ] Production preview works
- [ ] No CDN network requests for AlphaTab

---

## Phase 3: Volume Controls

### Task 3.1: Define Volume Control Interfaces

**Description**: Extend practice types with volume control interfaces
**Size**: Small
**Priority**: Medium
**Dependencies**: Task 2.4
**Can run parallel with**: Task 3.2 (after interface is defined)

**Source**: specs/infra-alphatab-modernization.md Section 5.4

**Technical Requirements**:
- Create or extend types file with volume interfaces
- Volume values use 0-1 range (0% to 100%)
- Maintain backwards compatibility with existing interfaces

**Implementation**:

Create new file or add to existing types:

```typescript
// src/components/practice/types.ts (create new file)

/**
 * Extended handle interface with volume controls.
 * All volume values use 0-1 range (0% to 100%).
 */
export interface AlphaTabHandle {
  // Existing methods
  play(): void;
  pause(): void;
  stop(): void;
  seekTo(percentage: number): void;
  setPlaybackSpeed(speed: number): void;
  setLoop(enabled: boolean): void;
  setLoopRange(range: { startTick: number; endTick: number } | null): void;
  renderTrack(index: number): void;
  toggleTrackMute(index: number): void;
  toggleTrackSolo(index: number): void;

  // NEW: Volume controls (0-1 range)
  setTrackVolume(index: number, volume: number): void;
  setMasterVolume(volume: number): void;
  setMetronomeVolume(volume: number): void;
  setCountInVolume(volume: number): void;
}

/**
 * Extended state interface with volume levels.
 * All volume values use 0-1 range (0% to 100%).
 */
export interface AlphaTabState {
  isPlaying: boolean;
  isLooping: boolean;
  currentSpeed: number;
  currentBPM: number;
  originalTempo: number;
  currentTrackIndex: number;
  metronomeBeat: number;

  // NEW: Volume state (0-1 range, default 1.0 except metronome/countIn default 0)
  masterVolume: number;
  metronomeVolume: number;
  countInVolume: number;
}

/**
 * Extended track info with volume.
 */
export interface TrackInfo {
  index: number;
  name: string;
  isMute: boolean;
  isSolo: boolean;

  // NEW: Track volume (0-1, default 1.0)
  volume: number;
}
```

**Acceptance Criteria**:
- [ ] Types file created with all interfaces
- [ ] All volume ranges documented as 0-1
- [ ] TypeScript compiles without errors
- [ ] Interfaces are exported and importable

---

### Task 3.2: Implement Volume Control Methods

**Description**: Add volume control methods to AlphaTabRenderer component
**Size**: Large
**Priority**: Medium
**Dependencies**: Task 3.1
**Can run parallel with**: None

**Source**: specs/infra-alphatab-modernization.md Section 5.5

**Technical Requirements**:
- Implement setTrackVolume, setMasterVolume, setMetronomeVolume, setCountInVolume
- All volume values clamped to 0-1 range
- Setting metronome/countIn volume > 0 enables the feature
- Methods update both API and internal state

**Implementation**:

Add to AlphaTabRenderer.tsx:

```typescript
// src/components/AlphaTabRenderer.tsx - Add volume state
const [masterVolume, setMasterVolumeState] = useState(1.0);
const [metronomeVolume, setMetronomeVolumeState] = useState(0);
const [countInVolume, setCountInVolumeState] = useState(0);

// NEW: Volume control methods
// All volume values use 0-1 range (0% to 100%)

/**
 * Set volume for a specific track.
 * @param index - Track index
 * @param volume - Volume level (0-1, clamped)
 */
const setTrackVolume = (index: number, volume: number) => {
  if (!apiRef.current) return;

  const clampedVolume = Math.max(0, Math.min(1, volume));
  const track = apiRef.current.score.tracks[index];

  if (!track) {
    console.warn(`[AlphaTab] Track index ${index} not found`);
    return;
  }

  apiRef.current.changeTrackVolume([track], clampedVolume);
  updateTracksFromAPI();
};

/**
 * Set master volume for all audio output.
 * @param volume - Volume level (0-1, clamped)
 */
const setMasterVolume = (volume: number) => {
  if (!apiRef.current) return;

  const clampedVolume = Math.max(0, Math.min(1, volume));
  apiRef.current.masterVolume = clampedVolume;
  setMasterVolumeState(clampedVolume);
};

/**
 * Set metronome volume. Setting > 0 enables metronome.
 * @param volume - Volume level (0-1, clamped; 0 = disabled)
 */
const setMetronomeVolume = (volume: number) => {
  if (!apiRef.current) return;

  const clampedVolume = Math.max(0, Math.min(1, volume));
  // Setting metronomeVolume > 0 enables the metronome
  apiRef.current.metronomeVolume = clampedVolume;
  setMetronomeVolumeState(clampedVolume);
};

/**
 * Set count-in volume. Setting > 0 enables count-in.
 * @param volume - Volume level (0-1, clamped; 0 = disabled)
 */
const setCountInVolume = (volume: number) => {
  if (!apiRef.current) return;

  const clampedVolume = Math.max(0, Math.min(1, volume));
  // Setting countInVolume > 0 enables count-in
  apiRef.current.countInVolume = clampedVolume;
  setCountInVolumeState(clampedVolume);
};

// Update updateTracksFromAPI to include volume:
const updateTracksFromAPI = () => {
  if (apiRef.current) {
    // Create new array reference with volume info
    const updatedTracks = apiRef.current.score.tracks.map((track, index) => ({
      ...track,
      // Track volume would need to be tracked separately if AlphaTab doesn't expose it
      // For now, default to 1.0
      volume: 1.0,
    }));
    setTracks(updatedTracks);
  }
};
```

**Exposing Methods via Ref/Handle**:

If the component needs to expose these methods to parent components:

```typescript
// Add useImperativeHandle if using ref pattern
import { useImperativeHandle, forwardRef } from 'react';

export interface AlphaTabRendererHandle {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (percentage: number) => void;
  setTrackVolume: (index: number, volume: number) => void;
  setMasterVolume: (volume: number) => void;
  setMetronomeVolume: (volume: number) => void;
  setCountInVolume: (volume: number) => void;
}

export const AlphaTabRenderer = forwardRef<AlphaTabRendererHandle, AlphaTabRendererProps>(
  ({ fileData, isPlaying, onPlaybackChange, readOnly = false }, ref) => {
    // ... existing code ...

    useImperativeHandle(ref, () => ({
      play: togglePlay, // or direct play
      pause: () => apiRef.current?.pause(),
      stop: stopPlayback,
      seekTo,
      setTrackVolume,
      setMasterVolume,
      setMetronomeVolume,
      setCountInVolume,
    }), [/* dependencies */]);

    // ... rest of component
  }
);

AlphaTabRenderer.displayName = 'AlphaTabRenderer';
```

**Acceptance Criteria**:
- [ ] All four volume methods implemented
- [ ] Volume values clamped to 0-1 range
- [ ] Invalid track index handled gracefully
- [ ] State updates correctly after volume changes
- [ ] TypeScript compiles without errors
- [ ] Methods are accessible (via ref or props callback)

---

### Task 3.3: Write Volume Control Tests

**Description**: Add comprehensive unit tests for all volume control methods
**Size**: Medium
**Priority**: Medium
**Dependencies**: Task 3.2
**Can run parallel with**: None

**Source**: specs/infra-alphatab-modernization.md Section 7

**Technical Requirements**:
- Test all four volume methods
- Test clamping behavior
- Test state updates
- Test edge cases (invalid index, no API)

**Implementation**:

```typescript
// src/components/AlphaTabRenderer.test.tsx - Add new describe block

describe('AlphaTabRenderer Volume Controls', () => {
  const mockTracks = [
    { name: 'Guitar', playbackInfo: { isMute: false, isSolo: false } },
    { name: 'Bass', playbackInfo: { isMute: false, isSolo: false } },
  ];

  beforeEach(async () => {
    render(<AlphaTabRenderer fileData={mockFileData} />);

    await waitFor(() => {
      expect(mockApiInstance.scoreLoaded.on).toHaveBeenCalled();
    });

    // Trigger score loaded with tracks
    const scoreLoadedHandler = mockApiInstance.scoreLoaded.on.mock.calls[0][0];
    act(() => {
      scoreLoadedHandler({ tracks: mockTracks, tempo: 120 });
    });
    mockApiInstance.score.tracks = mockTracks;
  });

  describe('track volume', () => {
    it('setTrackVolume calls changeTrackVolume on API', async () => {
      // Need to expose method via ref or callback - adjust based on implementation
      // For this test, assume we have access to the method

      // Example using ref:
      // act(() => { ref.current.setTrackVolume(0, 0.5); });

      // Verify API was called with correct arguments
      expect(mockApiInstance.changeTrackVolume).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'Guitar' })]),
        0.5
      );
    });

    it('setTrackVolume clamps volume above 1 to 1', async () => {
      // Set volume to 1.5 (above max)
      // act(() => { ref.current.setTrackVolume(0, 1.5); });

      expect(mockApiInstance.changeTrackVolume).toHaveBeenCalledWith(
        expect.any(Array),
        1.0 // Clamped to max
      );
    });

    it('setTrackVolume clamps volume below 0 to 0', async () => {
      // Set volume to -0.5 (below min)
      // act(() => { ref.current.setTrackVolume(0, -0.5); });

      expect(mockApiInstance.changeTrackVolume).toHaveBeenCalledWith(
        expect.any(Array),
        0 // Clamped to min
      );
    });

    it('setTrackVolume handles invalid track index gracefully', async () => {
      // Set volume for non-existent track
      // act(() => { ref.current.setTrackVolume(999, 0.5); });

      // Should not throw, should not call API
      expect(mockApiInstance.changeTrackVolume).not.toHaveBeenCalled();
    });
  });

  describe('master volume', () => {
    it('setMasterVolume sets masterVolume property', async () => {
      // act(() => { ref.current.setMasterVolume(0.75); });

      expect(mockApiInstance.masterVolume).toBe(0.75);
    });

    it('setMasterVolume clamps to valid range', async () => {
      // act(() => { ref.current.setMasterVolume(2.0); });

      expect(mockApiInstance.masterVolume).toBe(1.0);
    });
  });

  describe('metronome volume', () => {
    it('setMetronomeVolume sets metronomeVolume property', async () => {
      // act(() => { ref.current.setMetronomeVolume(0.3); });

      expect(mockApiInstance.metronomeVolume).toBe(0.3);
    });

    it('setMetronomeVolume with 0 disables metronome', async () => {
      // First enable
      // act(() => { ref.current.setMetronomeVolume(0.5); });
      // Then disable
      // act(() => { ref.current.setMetronomeVolume(0); });

      expect(mockApiInstance.metronomeVolume).toBe(0);
    });

    it('setMetronomeVolume with value > 0 enables metronome', async () => {
      // act(() => { ref.current.setMetronomeVolume(0.1); });

      expect(mockApiInstance.metronomeVolume).toBe(0.1);
      // Metronome is implicitly enabled when volume > 0
    });
  });

  describe('count-in volume', () => {
    it('setCountInVolume sets countInVolume property', async () => {
      // act(() => { ref.current.setCountInVolume(0.5); });

      expect(mockApiInstance.countInVolume).toBe(0.5);
    });

    it('setCountInVolume with 0 disables count-in', async () => {
      // act(() => { ref.current.setCountInVolume(0); });

      expect(mockApiInstance.countInVolume).toBe(0);
    });

    it('setCountInVolume clamps to valid range', async () => {
      // act(() => { ref.current.setCountInVolume(1.5); });

      expect(mockApiInstance.countInVolume).toBe(1.0);
    });
  });

  describe('edge cases', () => {
    it('volume methods do nothing when API not initialized', async () => {
      // Unmount and remount in loading state
      // Try to call volume methods
      // Should not throw
    });

    it('volume methods preserve state across renders', async () => {
      // Set volume
      // Trigger re-render
      // Verify volume state preserved
    });
  });
});
```

**Acceptance Criteria**:
- [ ] Tests for setTrackVolume (happy path, clamping, invalid index)
- [ ] Tests for setMasterVolume (happy path, clamping)
- [ ] Tests for setMetronomeVolume (enable, disable, clamping)
- [ ] Tests for setCountInVolume (enable, disable, clamping)
- [ ] Edge case tests (no API, invalid input)
- [ ] All tests pass

---

## Phase 4: Cleanup and Documentation

### Task 4.1: Remove Duplicate Font Files

**Description**: Remove manually copied Bravura fonts from public/font since Vite plugin manages them
**Size**: Small
**Priority**: Low
**Dependencies**: Task 2.4
**Can run parallel with**: Task 4.2

**Technical Requirements**:
- Verify Vite plugin copies fonts to dist/font/
- Remove public/font/ directory if it contains Bravura fonts
- Verify fonts still load correctly after removal

**Verification Steps**:

1. Check what's in public/font/:
```bash
ls -la public/font/
```

2. Build and verify plugin copies fonts:
```bash
npm run build
ls -la dist/font/
```

3. If public/font/ contains Bravura fonts duplicated by plugin, remove:
```bash
# Only if verified safe
rm -rf public/font/Bravura*
# Or remove entire directory if only contains Bravura
rm -rf public/font/
```

4. Test dev server and build still work

**Acceptance Criteria**:
- [ ] No duplicate font files between public/ and dist/
- [ ] Dev server still loads fonts correctly
- [ ] Production build still works
- [ ] Font loading verified in browser DevTools

---

### Task 4.2: Update CLAUDE.md Documentation

**Description**: Update project documentation with new AlphaTab integration details
**Size**: Small
**Priority**: Low
**Dependencies**: Task 2.4, Task 3.2
**Can run parallel with**: Task 4.1

**Technical Requirements**:
- Document Vite plugin usage
- Document ESM imports
- Document volume control API
- Remove CDN references

**Documentation Update**:

Update the AlphaTab section in CLAUDE.md:

```markdown
### AlphaTab Integration

AlphaTab is bundled via the Vite plugin (`@coderline/alphatab/vite`):

**Import Pattern:**
```typescript
import { AlphaTabApi, midi } from '@coderline/alphatab';
```

**Asset Management:**
- Fonts: Automatically copied to `/font` during build
- SoundFont: Automatically copied to `/soundfont` during build
- Workers: Configured automatically by plugin

**Volume Controls (all use 0-1 range):**
- `setTrackVolume(index, volume)` - Per-track volume (0-1, default 1)
- `setMasterVolume(volume)` - Overall volume (0-1, default 1)
- `setMetronomeVolume(volume)` - Metronome level (0-1, default 0; >0 enables metronome)
- `setCountInVolume(volume)` - Count-in level (0-1, default 0; >0 enables count-in)

**Note:** The npm package `@coderline/alphatab@^1.6.3` provides both TypeScript types and runtime code. No CDN dependency is required.
```

Remove this section from Common Pitfalls:
```markdown
1. **AlphaTab Global:** `AlphaTabRenderer` expects `window.alphaTab` from CDN. Ensure the script loads before React renders.
```

**Acceptance Criteria**:
- [ ] CLAUDE.md updated with new integration details
- [ ] CDN references removed from documentation
- [ ] Volume controls documented
- [ ] ESM import pattern documented

---

### Task 4.3: Pin Package Version

**Description**: Ensure AlphaTab package version is pinned in package.json
**Size**: Small
**Priority**: Low
**Dependencies**: None
**Can run parallel with**: Any

**Technical Requirements**:
- Verify version is pinned (no ^ or ~)
- Current version: 1.6.3

**Current package.json**:
```json
"@coderline/alphatab": "^1.6.3"
```

**If pinning desired**:
```json
"@coderline/alphatab": "1.6.3"
```

**Note**: The spec recommends staying on ~1.6.3. The `^` allows minor version updates which is generally safe. Only pin if strict version control is needed.

**Acceptance Criteria**:
- [ ] Review package.json version constraint
- [ ] Decision made on pinning (yes/no)
- [ ] If pinned, run npm install to verify

---

## Execution Summary

### Task Dependencies Graph

```
Phase 1: Vite Plugin Setup
├── Task 1.1: Add Vite Plugin ──┬──> Task 1.2: Verify Build
                                │
Phase 2: ESM Migration          │
├── Task 2.1: ESM Imports <─────┤
├── Task 2.2: Remove CDN <──────┘
├── Task 2.3: Update Tests (depends on 2.1)
└── Task 2.4: Integration Verification (depends on 2.1, 2.2, 2.3)

Phase 3: Volume Controls (depends on 2.4)
├── Task 3.1: Define Interfaces
├── Task 3.2: Implement Methods (depends on 3.1)
└── Task 3.3: Write Tests (depends on 3.2)

Phase 4: Cleanup (can run after respective dependencies)
├── Task 4.1: Remove Fonts (depends on 2.4)
├── Task 4.2: Update Docs (depends on 2.4, 3.2)
└── Task 4.3: Pin Version (independent)
```

### Parallel Execution Opportunities

- **Phase 1**: Sequential (1.1 → 1.2)
- **Phase 2**: 2.1 and 2.2 can run in parallel after 1.1
- **Phase 3**: 3.1 first, then 3.2, then 3.3 (sequential)
- **Phase 4**: 4.1, 4.2, 4.3 can all run in parallel after their dependencies

### Risk Mitigation

- **If ESM migration fails**: Revert vite.config.ts and re-add CDN script
- **If build time increases significantly**: Review Vite plugin options
- **If tests fail**: Check ESM mock hoisting order

### Total Tasks: 11

| Phase | Tasks | Estimated Complexity |
|-------|-------|---------------------|
| Phase 1 | 2 | Small |
| Phase 2 | 4 | Medium |
| Phase 3 | 3 | Medium-Large |
| Phase 4 | 3 | Small |

---

*Document version: 1.0*
*Generated: 2025-11-27*
