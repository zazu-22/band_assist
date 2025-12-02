# AlphaTab Infrastructure Modernization

## Metadata

| Field              | Value                                                             |
| ------------------ | ----------------------------------------------------------------- |
| **Status**         | Ready                                                             |
| **Authors**        | AI Assistant                                                      |
| **Date**           | 2025-11-27                                                        |
| **Related Issues** | N/A                                                               |
| **Depends On**     | None                                                              |
| **Blocks**         | `feat-practice-room-unified-control-bar.md` (optional dependency) |

---

## 1. Overview

This specification modernizes the AlphaTab integration from CDN-based script loading to a proper Vite-bundled ESM module. It also exposes additional player controls (track volume, master volume, metronome volume, count-in) that address real user problems with audio balance.

---

## 2. Background / Problem Statement

### Current Issues

#### 1. CDN Loading with `@latest` Tag

```html
<script src="https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.js">
```

- Version can change unexpectedly, causing breaking changes
- No build-time verification of AlphaTab availability
- Relies on external CDN availability

#### 2. Dual Installation Pattern

- npm package installed for TypeScript types only
- Runtime code loaded from CDN
- Version mismatch possible between types and runtime

#### 3. Missing Vite Plugin Configuration

- Web Workers not optimally configured for Vite
- Audio Worklets not configured
- No automatic asset management (fonts, soundfonts)

#### 4. Track Volume Imbalance (User Problem)

Users report that individual tracks (e.g., lead guitar) in multi-track files are too quiet or too loud relative to other tracks. The current implementation provides mute/solo but no volume control per track.

#### 5. Missing Audio Controls

- No master volume control
- No metronome volume control (metronome can be too loud/quiet)
- No count-in before playback starts

### Root Cause

The current architecture was built incrementally, prioritizing "make it work" over optimal integration. AlphaTab documentation recommends the Vite plugin for proper bundler integration, but this was bypassed by using CDN loading.

---

## 3. Goals

- **Migrate to Vite plugin** for proper ESM bundling and worker configuration
- **Pin AlphaTab version** via package.json, eliminating `@latest` drift
- **Remove CDN dependency** for AlphaTab runtime (fonts/soundfonts can remain CDN)
- **Expose track volume controls** in AlphaTabRenderer API
- **Add master volume control** for overall audio level
- **Add metronome volume control** for adjustable metronome
- **Add count-in option** for practice preparation
- **Maintain backwards compatibility** with existing AlphaTabRenderer usage

---

## 4. Non-Goals

- Changing AlphaTab library version (staying on ~1.6.3)
- Adding new file format support
- Modifying AlphaTab's internal behavior
- Creating a custom soundfont
- UI changes (those belong in the unified control bar spec)

---

## 5. Technical Design

### 5.1 Vite Plugin Integration

**vite.config.ts changes:**

```typescript
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

### 5.2 Remove CDN Script

**index.html changes:**

```diff
- <!-- AlphaTab for Guitar Pro files -->
- <script src="https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.js"></script>
```

### 5.3 ESM Import in AlphaTabRenderer

**Current (global access):**

```typescript
// Relies on window.alphaTab from CDN
const api = new window.alphaTab.AlphaTabApi(element, settings);
```

**After (ESM import):**

```typescript
import { AlphaTabApi, midi } from '@coderline/alphatab';

const api = new AlphaTabApi(element, settings);
```

### 5.4 Updated Type Definitions

Extend the practice types to include volume controls:

```typescript
// src/components/practice/types.ts

/**
 * Extended handle interface with volume controls.
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

  // NEW: Volume controls
  setTrackVolume(index: number, volume: number): void;
  setMasterVolume(volume: number): void;
  setMetronomeVolume(volume: number): void;
  setCountInVolume(volume: number): void;
}

/**
 * Extended state interface with volume levels.
 */
export interface AlphaTabState {
  isPlaying: boolean;
  isLooping: boolean;
  currentSpeed: number;
  currentBPM: number;
  originalTempo: number;
  currentTrackIndex: number;
  metronomeBeat: number;

  // NEW: Volume state
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

  // NEW: Track volume
  volume: number; // 0-1, default 1.0
}
```

### 5.5 AlphaTabRenderer Implementation Changes

```typescript
// Key changes to AlphaTabRenderer.tsx

import { AlphaTabApi, midi } from '@coderline/alphatab';

// Remove CDN check - no longer needed
// const checkLibrary = () => { ... }

// Direct initialization
const initAlphaTab = () => {
  const settings = {
    core: {
      fontDirectory: '/font/',
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

  const api = new AlphaTabApi(containerRef.current, settings);
  // ... rest of initialization
};

// NEW: Volume control methods
// All volume values use 0-1 range (0% to 100%)
const setTrackVolume = (index: number, volume: number) => {
  if (!apiRef.current) return;
  const clampedVolume = Math.max(0, Math.min(1, volume));
  const track = apiRef.current.score.tracks[index];
  apiRef.current.changeTrackVolume([track], clampedVolume);
  updateTracksFromAPI();
};

const setMasterVolume = (volume: number) => {
  if (!apiRef.current) return;
  apiRef.current.masterVolume = Math.max(0, Math.min(1, volume));
};

const setMetronomeVolume = (volume: number) => {
  if (!apiRef.current) return;
  // Setting metronomeVolume > 0 enables the metronome
  apiRef.current.metronomeVolume = Math.max(0, Math.min(1, volume));
};

const setCountInVolume = (volume: number) => {
  if (!apiRef.current) return;
  // Setting countInVolume > 0 enables count-in (no separate boolean needed)
  apiRef.current.countInVolume = Math.max(0, Math.min(1, volume));
};
```

### 5.6 Settings Configuration

Update AlphaTab settings to use local assets:

```typescript
const settings = {
  core: {
    fontDirectory: '/font/', // Vite plugin copies fonts here
    useWorkers: true, // Plugin configures workers
  },
  player: {
    enablePlayer: !readOnly,
    soundFont: '/soundfont/sonivox.sf2', // Vite plugin copies soundfont here
    scrollElement: rootRef.current,
    // NEW: Enable count-in
    countInVolume: 0.5, // Default 50%, can be adjusted
  },
  display: {
    layoutMode: 'page',
    staveProfile: 'Default',
  },
};
```

---

## 6. Migration Steps

### Phase 1: Vite Plugin Setup

1. Add Vite plugin to `vite.config.ts`
2. Run `npm run build` to verify plugin works
3. Check that `/font` and `/soundfont` directories are created in build output

**Verification:**

- [ ] `npm run build` succeeds
- [ ] `dist/font/` contains Bravura fonts
- [ ] `dist/soundfont/` contains sonivox.sf2

### Phase 2: ESM Migration

1. Update AlphaTabRenderer to use ESM imports
2. Remove `window.alphaTab` type declarations
3. Remove CDN script from `index.html`
4. Update soundfont path from CDN to local

**Verification:**

- [ ] AlphaTabRenderer loads without errors
- [ ] Guitar Pro files render correctly
- [ ] Playback works with local soundfont
- [ ] Workers function correctly (check DevTools)

### Phase 3: Volume Controls

1. Add volume control methods to AlphaTabRenderer
2. Extend AlphaTabHandle interface
3. Extend TrackInfo interface with volume
4. Add volume state tracking
5. Write tests for new methods

**Verification:**

- [ ] `setTrackVolume()` adjusts track audio level
- [ ] `setMasterVolume()` adjusts overall level
- [ ] `setMetronomeVolume()` adjusts metronome level
- [ ] Track volume persists across playback sessions

### Phase 4: Cleanup

1. Remove manual Bravura fonts from `public/font/` (optional - Vite plugin manages these)
2. Update CLAUDE.md documentation
3. Pin package version in package.json (remove ^ if present)

**Verification:**

- [ ] No duplicate font files
- [ ] Documentation accurate
- [ ] All existing tests pass
- [ ] TypeScript strict mode passes

---

## 7. Testing Strategy

### ESM Mocking Strategy

After migrating to ESM imports, the test mocking approach must change from `window.alphaTab` to ESM module mocks.

**Current approach (CDN-based):**

```typescript
// Current: Mocks window.alphaTab global
window.alphaTab = {
  AlphaTabApi: MockAlphaTabApi,
  midi: { MidiEventType: { AlphaTabMetronome: 1 } },
};
```

**New approach (ESM-based):**

```typescript
// New: Use vi.mock for ESM imports
import { vi } from 'vitest';

// Must be hoisted - place at top of test file
vi.mock('@coderline/alphatab', () => ({
  AlphaTabApi: vi.fn().mockImplementation(() => mockApiInstance),
  midi: {
    MidiEventType: {
      AlphaTabMetronome: 1,
    },
  },
}));

// Mock instance with all required properties
const mockApiInstance = {
  destroy: vi.fn(),
  load: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  stop: vi.fn(),
  renderTracks: vi.fn(),
  changeTrackMute: vi.fn(),
  changeTrackSolo: vi.fn(),
  changeTrackVolume: vi.fn(),
  playbackSpeed: 1.0,
  timePosition: 0,
  isLooping: false,
  playbackRange: null,
  masterVolume: 1.0,
  metronomeVolume: 0,
  countInVolume: 0,
  score: { tracks: [], tempo: 120 },
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
```

**Migration steps for existing tests:**

1. Remove `window.alphaTab` setup from `beforeEach`
2. Add `vi.mock('@coderline/alphatab', ...)` at file top (hoisted)
3. Add new volume properties to mock: `masterVolume`, `metronomeVolume`, `countInVolume`, `changeTrackVolume`
4. Remove the `declare global { interface Window { alphaTab: ... } }` type extension from `AlphaTabRenderer.tsx`

### Unit Tests

```typescript
// src/components/AlphaTabRenderer.test.tsx (additions)

describe('AlphaTabRenderer Volume Controls', () => {
  describe('track volume', () => {
    it('setTrackVolume calls changeTrackVolume on API', async () => {
      let capturedHandle: AlphaTabHandle | null = null;
      render(<AlphaTabRenderer fileData={mockFileData} onReady={(h) => { capturedHandle = h; }} />);

      await waitFor(() => { expect(capturedHandle).not.toBeNull(); });

      act(() => { capturedHandle!.setTrackVolume(0, 0.5); });
      expect(mockApiInstance.changeTrackVolume).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Object)]),
        0.5
      );
    });

    it('setTrackVolume clamps to valid range', async () => {
      // Volume should be clamped to 0-1 range (AlphaTab API uses 0-100% as 0-1)
      let capturedHandle: AlphaTabHandle | null = null;
      render(<AlphaTabRenderer fileData={mockFileData} onReady={(h) => { capturedHandle = h; }} />);

      await waitFor(() => { expect(capturedHandle).not.toBeNull(); });

      act(() => { capturedHandle!.setTrackVolume(0, 1.5); }); // Over max
      expect(mockApiInstance.changeTrackVolume).toHaveBeenCalledWith(
        expect.any(Array),
        1.0 // Clamped to max
      );
    });
  });

  describe('master volume', () => {
    it('setMasterVolume sets masterVolume property', async () => {
      let capturedHandle: AlphaTabHandle | null = null;
      render(<AlphaTabRenderer fileData={mockFileData} onReady={(h) => { capturedHandle = h; }} />);

      await waitFor(() => { expect(capturedHandle).not.toBeNull(); });

      act(() => { capturedHandle!.setMasterVolume(0.75); });
      expect(mockApiInstance.masterVolume).toBe(0.75);
    });
  });

  describe('metronome volume', () => {
    it('setMetronomeVolume sets metronomeVolume property', async () => {
      let capturedHandle: AlphaTabHandle | null = null;
      render(<AlphaTabRenderer fileData={mockFileData} onReady={(h) => { capturedHandle = h; }} />);

      await waitFor(() => { expect(capturedHandle).not.toBeNull(); });

      act(() => { capturedHandle!.setMetronomeVolume(0.3); });
      expect(mockApiInstance.metronomeVolume).toBe(0.3);
    });
  });
});
```

### Integration Tests

```typescript
describe('AlphaTab ESM Integration', () => {
  it('loads AlphaTab via ESM import', () => {
    // Verify import works (would fail if CDN was still required)
    expect(AlphaTabApi).toBeDefined();
    expect(midi.MidiEventType).toBeDefined();
  });

  it('uses local soundfont', async () => {
    render(<AlphaTabRenderer fileData={mockFileData} />);

    // Verify soundfont loaded from local path
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/soundfont/sonivox.sf2')
      );
    });
  });
});
```

---

## 8. Rollback Plan

If ESM migration causes issues:

1. **Immediate:** Revert vite.config.ts and re-add CDN script to index.html
2. **Short-term:** Pin CDN version to 1.6.3 instead of @latest
3. **Investigation:** Check Vite plugin compatibility with current setup

The volume control additions are independent of the ESM migration and can be kept even if ESM migration is rolled back.

---

## 9. Performance Considerations

### Expected Improvements

- **Faster initial load:** Bundled workers vs CDN fetch
- **Better caching:** Versioned assets vs CDN cache
- **Smaller payload:** Tree-shaking unused AlphaTab features (if applicable)

### Potential Concerns

- **Build time:** Vite plugin adds ~2-5s to build
- **Bundle size:** AlphaTab is ~1.5MB; will be code-split automatically

### Monitoring

After deployment, check:

- First Contentful Paint (FCP) for Guitar Pro files
- Time to Interactive (TTI) for player ready state
- Worker initialization time in Performance tab

---

## 10. Security Considerations

- **No new external dependencies:** Moving from CDN to bundled reduces external dependency
- **SoundFont loading:** Still fetches SF2 file; no security change
- **Worker isolation:** Web Workers provide same-origin isolation

---

## 11. Documentation Updates

### CLAUDE.md Updates

```markdown
### AlphaTab Integration

AlphaTab is bundled via the Vite plugin (`@coderline/alphatab/vite`):

- ESM imports: `import { AlphaTabApi } from '@coderline/alphatab'`
- Fonts: Automatically copied to `/font` during build
- SoundFont: Automatically copied to `/soundfont` during build
- Workers: Configured automatically by plugin

**Volume Controls (all use 0-1 range):**

- `setTrackVolume(index, volume)` - Per-track volume (0-1, default 1)
- `setMasterVolume(volume)` - Overall volume (0-1, default 1)
- `setMetronomeVolume(volume)` - Metronome level (0-1, default 0; >0 enables metronome)
- `setCountInVolume(volume)` - Count-in level (0-1, default 0; >0 enables count-in)
```

---

## 12. Open Questions

1. **Keep manual fonts in public/?** The Vite plugin copies fonts, but we already have them. Could remove manual copy to avoid duplication.
   - _Recommendation:_ Remove manual fonts after verifying plugin copies work

2. **CDN soundfont vs local?** Local soundfont adds ~1.5MB to build. CDN version works but adds network dependency.
   - _Recommendation:_ Use local for reliability; file is cached after first load

3. ~~**Count-in default volume?** What's a reasonable default for count-in?~~
   - _Resolved:_ Count-in is disabled by default (volume=0). Setting `countInVolume > 0` enables it at that volume level. UI should expose a slider starting at 0 (off).

---

## 13. Relationship to UI Spec

This infrastructure spec is **recommended but not required** for the unified control bar UI spec.

### If Done First (Recommended)

1. UI spec can use cleaner ESM imports
2. Volume controls available for mixer UI
3. Type definitions include volume from the start
4. Single implementation of AlphaTabHandle interface

### If Done After or Skipped

1. UI spec works with current CDN approach
2. Volume controls added as separate enhancement
3. Minor refactoring needed when infrastructure spec is implemented

### Recommended Order

```text
1. infra-alphatab-modernization.md (Phases 1-2: ESM migration)
2. feat-practice-room-unified-control-bar.md (All phases)
3. infra-alphatab-modernization.md (Phase 3: Volume controls - can be concurrent with UI Phase 2+)
```

This allows the UI work to begin on a solid foundation while volume controls are added in parallel.

---

## 14. Success Criteria

| Metric                  | Target                   |
| ----------------------- | ------------------------ |
| CDN dependencies        | 0 (for AlphaTab runtime) |
| Build succeeds          | Yes                      |
| All existing tests pass | Yes                      |
| Worker initialization   | < 500ms                  |
| Volume control latency  | < 50ms                   |

---

## 15. References

### AlphaTab Documentation

- [Installation - Web](https://www.alphatab.net/docs/getting-started/installation-web)
- [Installation - Vite](https://www.alphatab.net/docs/getting-started/installation-vite)
- [API Reference](https://www.alphatab.net/docs/reference/api)
- [Settings Reference](https://www.alphatab.net/docs/reference/settings)

### Related Files

- `vite.config.ts` - Build configuration
- `index.html` - CDN script to remove
- `src/components/AlphaTabRenderer.tsx` - Main implementation
- `public/font/` - Manual font copy (may be removed)
- `public/alphatab-custom.css` - Player styling (unchanged)

---

_Document version: 1.1_
_Last updated: 2025-11-27_

**Changelog:**

- v1.1: Fixed volume range from 0-2 to 0-1 per AlphaTab API docs; added ESM test mocking strategy; clarified count-in/metronome enable behavior; added volume clamping to implementation
