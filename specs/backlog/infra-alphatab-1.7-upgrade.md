# Infrastructure: AlphaTab 1.7 Upgrade

| Field       | Value                    |
| ----------- | ------------------------ |
| **Status**  | Backlog                  |
| **Authors** | Claude & Jason           |
| **Created** | 2025-12-10               |
| **Updated** | 2025-12-10               |
| **Priority**| High                     |
| **Type**    | Infrastructure           |
| **Effort**  | Small (1-2 days)         |

---

## Summary

Upgrade AlphaTab from 1.6.3 to 1.7.1 to gain access to the AlphaTex exporter, improved APIs, and bug fixes. This is a prerequisite for the Song Collaboration & Annotation feature set.

---

## Problem Statement

Current AlphaTab version (1.6.3) lacks:
- **AlphaTex export** - Cannot convert GP files to editable text format
- **Beat-level lyrics support** - Limited annotation capabilities
- **MIDI bank support** - Reduced playback fidelity
- **Improved SMuFL compliance** - Font rendering inconsistencies
- Various bug fixes and improvements

---

## Solution

Upgrade to `@coderline/alphatab@^1.7.1` and verify compatibility with existing integration.

### Key New Features in 1.7

| Feature | Benefit |
|---------|---------|
| **AlphaTex Exporter** | Export GP → text format for debugging, storage, future editing |
| **AST-based AlphaTex Parser** | Better language support for future editor integration |
| **Beat-level Lyrics** | Potential annotation mechanism |
| **MIDI Bank Support** | Better instrument variations in playback |
| **SMuFL Improvements** | Cleaner notation rendering |
| **Tempo Visibility Control** | Hide/show tempo markers per element |

---

## Current Integration Analysis

### Files Affected

| File | Lines | Risk Level | Notes |
|------|-------|------------|-------|
| `src/components/AlphaTabRenderer.tsx` | 1,833 | Medium | Main integration |
| `src/components/LazyAlphaTab.tsx` | 61 | Low | Lazy loading wrapper |
| `src/lib/trackMatcher.ts` | 75 | Low | Track selection |
| `vite.config.ts` | - | Low | Vite plugin config |
| `package.json` | - | Low | Dependency update |

### API Usage Review

Based on codebase analysis, our current API usage:

**Core APIs (Unchanged in 1.7):**
- `new AlphaTabApi(element, settings)` ✅
- `play()`, `pause()`, `stop()` ✅
- `masterVolume`, `metronomeVolume`, `countInVolume` ✅
- `changeTrackMute()`, `changeTrackSolo()`, `changeTrackVolume()` ✅
- Event handlers (`scoreLoaded`, `playerReady`, etc.) ✅
- Vite plugin `@coderline/alphatab/vite` ✅

**Settings Used:**
```typescript
display: {
  layoutMode: 'page',
  staveProfile: 'Default',
}
```
These settings are unchanged in 1.7.

### Breaking Changes Assessment

Per GitHub issue #152 analysis and release notes:
- **No breaking changes** affecting our current implementation
- Settings reorganization is additive, not breaking
- All existing events and APIs preserved

---

## Implementation Plan

### Step 1: Update Dependencies

```bash
npm install @coderline/alphatab@^1.7.1
```

### Step 2: Verify TypeScript Types

Check for any type definition changes:
```bash
npm run typecheck
```

### Step 3: Test Core Functionality

Manual testing checklist:

**Rendering:**
- [ ] GP3/4/5 files render correctly
- [ ] GP6 (.gpx) files render correctly
- [ ] GP7 (.gp) files render correctly
- [ ] Multi-track files display all tracks
- [ ] Tab notation renders properly
- [ ] Standard notation renders properly

**Playback:**
- [ ] Play/pause/stop work
- [ ] Playback speed adjustment works (0.25x - 2.0x)
- [ ] BPM display shows correct tempo
- [ ] Seek/scrub works
- [ ] Loop mode works
- [ ] Metronome works

**Audio:**
- [ ] Master volume control works
- [ ] Track mute/solo works
- [ ] Track volume individual control works
- [ ] Count-in works
- [ ] iOS Safari audio activation works

**Track Management:**
- [ ] Track selector shows all tracks
- [ ] Track switching renders new track
- [ ] Auto-track selection (preferredInstrument) works

### Step 4: Test New Features

**AlphaTex Export (New):**
```typescript
// Test export capability
const exporter = new alphaTab.exporter.AlphaTexExporter();
const texCode = exporter.exportToString(api.score, api.settings);
console.log('AlphaTex output:', texCode);
```

- [ ] Can export loaded GP file to AlphaTex
- [ ] Exported AlphaTex can be re-imported
- [ ] Round-trip produces equivalent rendering

### Step 5: Performance Verification

- [ ] Bundle size delta is acceptable
- [ ] Initial load time unchanged
- [ ] Rendering performance unchanged
- [ ] Memory usage stable

---

## New APIs to Expose

After upgrade, expose these new capabilities in `AlphaTabRenderer`:

### AlphaTex Export

```typescript
// Add to AlphaTabHandle interface
interface AlphaTabHandle {
  // ... existing methods ...

  /**
   * Export current score to AlphaTex text format
   * @returns AlphaTex string representation of the score
   */
  exportToAlphaTex(): string | null;
}

// Implementation
exportToAlphaTex(): string | null {
  if (!this.api?.score) return null;

  const exporter = new alphaTab.exporter.AlphaTexExporter();
  return exporter.exportToString(this.api.score, this.api.settings);
}
```

### BoundsLookup Access

```typescript
// Add to AlphaTabHandle interface
interface AlphaTabHandle {
  // ... existing methods ...

  /**
   * Get bounds lookup for annotation positioning
   * Only valid after render completes
   */
  getBoundsLookup(): BoundsLookup | null;

  /**
   * Find beat at screen coordinates
   */
  getBeatAtPosition(x: number, y: number): Beat | null;
}
```

### Beat Reference Helper

```typescript
// Add utility type
interface BeatReference {
  trackIndex: number;
  barIndex: number;
  voiceIndex: number;
  beatIndex: number;
}

// Add helper
getBeatReference(beat: Beat): BeatReference {
  return {
    trackIndex: beat.voice.bar.staff.track.index,
    barIndex: beat.voice.bar.index,
    voiceIndex: beat.voice.index,
    beatIndex: beat.index,
  };
}
```

---

## Rollback Plan

If issues discovered post-upgrade:

```bash
npm install @coderline/alphatab@^1.6.3
```

No code changes required for rollback as APIs are backward compatible.

---

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | Update alphatab version |
| `src/components/AlphaTabRenderer.tsx` | Add new API methods (optional in this phase) |
| `src/components/practice/types.ts` | Add `BeatReference` type (optional) |

---

## Acceptance Criteria

### Required

- [ ] AlphaTab updated to 1.7.1
- [ ] All existing tests pass
- [ ] TypeScript compiles without errors
- [ ] ESLint passes without new warnings
- [ ] Manual testing checklist complete
- [ ] iOS Safari audio still works
- [ ] No performance regression

### Optional (Can Defer)

- [ ] `exportToAlphaTex()` method added to AlphaTabHandle
- [ ] `getBoundsLookup()` method added to AlphaTabHandle
- [ ] `BeatReference` type added

---

## Testing Strategy

### Automated

```bash
npm run typecheck  # TypeScript compilation
npm run lint       # ESLint check
npm test           # Unit tests (AlphaTabRenderer.test.tsx, LazyAlphaTab.test.tsx)
```

### Manual

Use the test GP files in the development environment:
1. Navigate to Practice Room
2. Select songs with GP charts
3. Verify rendering and playback
4. Test on iOS Safari (via ngrok or local network)

### Test Files Needed

Ensure test coverage for:
- Simple GP file (single track)
- Complex GP file (multiple tracks)
- GP file with section markers
- GP file with tempo changes
- GP file with repeat sections

---

## Documentation Updates

After upgrade, update:

1. **CLAUDE.md** - Note AlphaTab version if relevant
2. **GitHub Issue #152** - Close with upgrade summary
3. **This spec** - Move to `specs/done/`

---

## Dependencies

**Blocks:**
- `feat-song-collaboration-architecture.md` - Phase 1-5
- `feat-lead-sheet-generation.md` - Section extraction

**Blocked By:**
- None

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking API change | Low | High | Thorough testing, rollback plan |
| Bundle size increase | Low | Low | Monitor, lazy loading already implemented |
| iOS Safari regression | Low | High | Test on real device before merge |
| Performance regression | Low | Medium | Benchmark before/after |

---

## Timeline

| Task | Estimate |
|------|----------|
| Dependency update | 15 min |
| TypeScript/lint verification | 15 min |
| Manual testing (desktop) | 1 hour |
| Manual testing (iOS) | 30 min |
| AlphaTex export testing | 30 min |
| New API implementation (optional) | 2 hours |
| Documentation | 30 min |
| **Total** | **~5 hours** |

---

## References

- [AlphaTab 1.7 Release Notes](https://alphatab.net/docs/releases/release1_7)
- [AlphaTab GitHub Release v1.7.1](https://github.com/CoderLine/alphaTab/releases/tag/v1.7.1)
- [AlphaTex Exporter Guide](https://alphatab.net/docs/guides/exporter/)
- GitHub Issue #152 - AlphaTab 1.7 Evaluation
- Architecture: `specs/backlog/feat-song-collaboration-architecture.md`
