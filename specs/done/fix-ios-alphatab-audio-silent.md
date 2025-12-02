# Fix: AlphaTab Audio Silent on iOS Safari

**Status:** Draft
**Author:** Claude Code
**Date:** 2025-12-01
**Type:** Bugfix
**Priority:** Critical
**Branch:** `fix/ios-audio-activation`

---

## Overview

AlphaTab audio playback is completely silent on iOS Safari despite visual indicators showing playback is occurring. The root cause is a race condition where `play()` is called before the AudioContext activation completes.

## Problem Statement

### Observed Behavior
- AlphaTab Guitar Pro playback shows as "playing" in Safari's audio indicators
- **No audio is audible** on iOS Safari
- HTML5 `<audio>` backing tracks (uploaded MP3s) work correctly on the same device
- Desktop browsers work correctly

### Root Cause
The current implementation in `AlphaTabRenderer.tsx` (lines 903-912):

```typescript
if (action === 'play') {
  if (apiRef.current.player?.output) {
    try {
      apiRef.current.player.output.activate();  // ← Async operation, returns immediately
    } catch (e) {
      console.warn('[AlphaTab] Audio activation warning:', e);
    }
  }
  apiRef.current.play();  // ← Called immediately - AudioContext not yet resumed!
}
```

The `activate()` method triggers an async AudioContext resume but returns immediately. On iOS Safari, the AudioContext is still in "suspended" state when `play()` is called, resulting in silent output.

### Why HTML5 Audio Works
HTML5 `<audio>` elements handle their own audio session management and don't require explicit AudioContext activation. The Web Audio API (used by AlphaTab's synthesizer) requires explicit user-gesture-triggered activation on iOS.

## Goals

- Fix AlphaTab audio playback on iOS Safari so users can hear Guitar Pro files
- Maintain backwards compatibility with desktop browsers
- Handle edge cases gracefully (activation failures, missing player output)

## Non-Goals

- Changing the shared `audioContext.ts` module (already working correctly)
- Modifying HTML5 audio handling (already working)
- Adding new features beyond the audio fix

## Technical Dependencies

- **AlphaTab**: Current version in use
- **AlphaTab API**: `player.output.activate(resumedCallback?: () => void)` - accepts an optional callback that fires when AudioContext successfully resumes

## Detailed Design

### Fix 1: AlphaTabRenderer - Use Activation Callback

**File:** `src/components/AlphaTabRenderer.tsx`
**Location:** `runPlaybackAction` function, lines 903-912

**Current Code:**
```typescript
if (action === 'play') {
  // Activate audio context for iOS Safari before playing
  if (apiRef.current.player?.output) {
    try {
      apiRef.current.player.output.activate();
    } catch (e) {
      console.warn('[AlphaTab] Audio activation warning:', e);
    }
  }
  apiRef.current.play();
}
```

**Fixed Code:**
```typescript
if (action === 'play') {
  // Activate audio context for iOS Safari before playing
  if (apiRef.current.player?.output) {
    try {
      apiRef.current.player.output.activate(() => {
        // Only play after audio context is successfully activated
        apiRef.current?.play();
      });
    } catch (e) {
      console.warn('[AlphaTab] Audio activation warning:', e);
      // Fallback: try to play anyway in case activation failed but context is running
      apiRef.current.play();
    }
  } else {
    // No player output available - try to play directly
    apiRef.current.play();
  }
}
```

**Key Changes:**
1. Pass callback to `activate()` that calls `play()` only after activation completes
2. Use optional chaining (`apiRef.current?.play()`) in callback since ref could be null by callback time
3. Move `play()` into callback for the happy path
4. Keep fallback `play()` in catch block for error cases
5. Add else branch to handle missing `player.output`

### Fix 2: Update AlphaTabApi Interface

**File:** `src/components/AlphaTabRenderer.tsx`
**Location:** `AlphaTabApi` interface definition

Update the `activate` method signature to include the optional callback:

```typescript
player: {
  output: {
    activate(resumedCallback?: () => void): void;
  };
} | null;
```

### Fix 3: PracticeRoom Metronome (Secondary)

**File:** `src/components/PracticeRoom.tsx`
**Location:** Line 255

The current code uses `void activateAudioContext()` which ignores the promise. While this works because the metronome creates oscillators on an interval (giving time for activation), it should handle errors:

**Current:**
```typescript
void activateAudioContext();
```

**Fixed:**
```typescript
activateAudioContext().catch(err =>
  console.warn('[PracticeRoom] Audio activation failed:', err)
);
```

This change is defensive - the metronome likely works because the interval callback runs after activation completes, but proper error handling prevents silent failures.

## User Experience

### Before Fix
- User opens a Guitar Pro chart on iOS Safari
- User taps play button
- Visual playback indicators show activity
- **No sound is heard**
- User confusion - appears broken

### After Fix
- User opens a Guitar Pro chart on iOS Safari
- User taps play button
- Brief moment while AudioContext activates (imperceptible on most devices)
- Audio plays correctly
- Consistent experience across all platforms

## Testing Strategy

### Unit Tests

**File:** `src/components/AlphaTabRenderer.test.tsx`

```typescript
describe('iOS audio activation', () => {
  it('waits for activation callback before calling play', () => {
    let capturedCallback: (() => void) | undefined;
    const mockActivate = vi.fn((callback?: () => void) => {
      capturedCallback = callback;
    });
    const mockPlay = vi.fn();

    // Setup mock API with player.output.activate
    // Trigger play action

    expect(mockActivate).toHaveBeenCalled();
    expect(mockPlay).not.toHaveBeenCalled(); // Not called immediately

    // Simulate activation completing
    capturedCallback?.();
    expect(mockPlay).toHaveBeenCalled(); // Now called
  });

  it('falls back to direct play when player.output is unavailable', () => {
    const mockPlay = vi.fn();
    // Setup mock API with player: { output: null }
    // Trigger play action

    expect(mockPlay).toHaveBeenCalled();
  });

  it('attempts play in catch block when activation throws', () => {
    const mockActivate = vi.fn(() => {
      throw new Error('Activation failed');
    });
    const mockPlay = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Trigger play action - should not throw

    expect(warnSpy).toHaveBeenCalled();
    expect(mockPlay).toHaveBeenCalled(); // Fallback play attempted

    warnSpy.mockRestore();
  });
});
```

**File:** `src/components/PracticeRoom.test.tsx`

```typescript
describe('Metronome audio activation', () => {
  it('handles activation failure gracefully', async () => {
    const mockActivate = vi.fn().mockRejectedValue(new Error('Failed'));
    vi.mock('@/lib/audioContext', () => ({
      activateAudioContext: mockActivate,
      getAudioContext: vi.fn()
    }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Toggle metronome on - should not throw
    // Verify warning was logged

    warnSpy.mockRestore();
  });
});
```

### Manual Testing

**Critical Path - iOS Safari:**
1. Deploy to Vercel preview
2. Open on iOS Safari (iPhone/iPad)
3. Navigate to a song with a Guitar Pro file
4. Tap play button
5. **Verify audio is audible** (not just visual playback)
6. Test pause/resume
7. Test seeking and resuming playback

**Regression Testing:**
1. Test on desktop Chrome, Firefox, Safari
2. Verify no playback delay or issues introduced
3. Test metronome in Practice Room on iOS Safari
4. Test HTML5 audio backing tracks still work

### Test Devices
- iPhone (iOS 17+) - Safari
- iPad (iPadOS 17+) - Safari
- Desktop browsers (regression check)

## Performance Considerations

- **Minimal impact**: The callback approach adds negligible latency (AudioContext resume is typically <50ms)
- **No additional network calls**: All processing is local
- **Memory**: No additional memory usage

## Security Considerations

- No security implications - this is a timing fix for existing functionality
- No new user data is collected or transmitted

## Implementation Phases

### Phase 1: Core Fix (This PR)
1. Update `runPlaybackAction` to use activation callback
2. Update `AlphaTabApi` interface for callback signature
3. Add error handling to PracticeRoom metronome activation
4. Add unit tests
5. Manual verification on iOS Safari

### Phase 2: Future Enhancements (Out of Scope)
- Consider adding loading state during activation
- Explore preemptive activation on component mount

## Files Changed

| File | Change |
|------|--------|
| `src/components/AlphaTabRenderer.tsx` | Update `runPlaybackAction` to use callback, update interface |
| `src/components/PracticeRoom.tsx` | Add error handling to `activateAudioContext()` call |
| `src/components/AlphaTabRenderer.test.tsx` | Add iOS audio activation tests |

## Open Questions

1. **Should we show a loading indicator during activation?** - Likely unnecessary given activation is fast, but could improve perceived responsiveness. Recommend deferring to Phase 2 if needed.

2. **Should activation be preemptive?** - Could activate on component mount or first user interaction. Current approach (activate on play) is simpler and proven pattern. Defer unless issues arise.

## References

- AlphaTab GitHub issue on iOS audio: https://github.com/CoderLine/alphaTab/issues
- Web Audio API iOS restrictions: https://webkit.org/blog/6784/new-video-policies-for-ios/
- Previous spec: `specs/done/fix-ios-audio.md`
- Related commits: `94cfcc7`, `636f361`, `e5813de`
