# Task Breakdown: Fix AlphaTab Audio Silent on iOS Safari

Generated: 2025-12-01
Source: specs/pending/fix-ios-alphatab-audio-silent.md

## Overview

This task breakdown addresses a critical bug where AlphaTab audio playback is completely silent on iOS Safari despite visual indicators showing playback is occurring. The root cause is a race condition where `play()` is called before the AudioContext activation completes.

**Total Tasks:** 4
**Estimated Complexity:** Small (focused bugfix with clear implementation path)

---

## Phase 1: Core Implementation

### Task 1.1: Update AlphaTabApi Interface Type Definition

**Description:** Add optional callback parameter to the `activate` method signature in the AlphaTabApi interface
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** None (foundational change)

**File:** `src/components/AlphaTabRenderer.tsx`
**Location:** Lines 115-120 (AlphaTabApi interface, player.output property)

**Current Code:**
```typescript
// Player output for iOS Safari audio activation
player: {
  output: {
    activate(): void;
  };
} | null;
```

**Fixed Code:**
```typescript
// Player output for iOS Safari audio activation
player: {
  output: {
    activate(resumedCallback?: () => void): void;
  };
} | null;
```

**Key Changes:**
1. Add optional `resumedCallback` parameter to `activate` method signature
2. Callback fires when AudioContext successfully resumes (per AlphaTab API documentation)

**Acceptance Criteria:**
- [ ] Interface definition includes optional callback parameter
- [ ] TypeScript compiles without errors
- [ ] No impact on existing code using `activate()` without callback

---

### Task 1.2: Implement Activation Callback in runPlaybackAction

**Description:** Modify the `runPlaybackAction` function to use the activation callback, ensuring `play()` is only called after AudioContext is activated
**Size:** Medium
**Priority:** High (core fix)
**Dependencies:** Task 1.1
**Can run parallel with:** None

**File:** `src/components/AlphaTabRenderer.tsx`
**Location:** `runPlaybackAction` function, lines 903-912

**Current Code (lines 903-912):**
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

**Technical Notes:**
- The callback pattern ensures iOS Safari's AudioContext is fully resumed before `play()`
- Optional chaining prevents null reference errors if component unmounts during activation
- Fallback in catch block maintains backwards compatibility if activation throws

**Acceptance Criteria:**
- [ ] `activate()` is called with callback on play action
- [ ] `play()` is only called inside the callback (not immediately after activate)
- [ ] Optional chaining used in callback (`apiRef.current?.play()`)
- [ ] Fallback `play()` called in catch block when activation throws
- [ ] Direct `play()` called when `player.output` is unavailable
- [ ] TypeScript compiles without errors
- [ ] Desktop browsers continue to work (no regression)

---

### Task 1.3: Add Error Handling to PracticeRoom Metronome Activation

**Description:** Replace `void activateAudioContext()` with proper error handling using `.catch()`
**Size:** Small
**Priority:** Medium (defensive fix)
**Dependencies:** None
**Can run parallel with:** Task 1.1, Task 1.2

**File:** `src/components/PracticeRoom.tsx`
**Location:** Line 255

**Current Code:**
```typescript
void activateAudioContext();
```

**Fixed Code:**
```typescript
activateAudioContext().catch(err =>
  console.warn('[PracticeRoom] Audio activation failed:', err)
);
```

**Technical Notes:**
- Current code uses `void` to explicitly ignore the promise, which swallows any errors
- The metronome likely works because the interval callback runs after activation completes
- Proper error handling prevents silent failures and aids debugging
- No functional change expected, but improves maintainability

**Acceptance Criteria:**
- [ ] `activateAudioContext()` call replaced with `.catch()` error handling
- [ ] Warning logged to console on activation failure
- [ ] Log prefix is `[PracticeRoom]` for consistency
- [ ] Metronome continues to function normally
- [ ] TypeScript compiles without errors

---

## Phase 2: Testing

### Task 2.1: Add Unit Tests for iOS Audio Activation

**Description:** Add comprehensive unit tests for the iOS audio activation behavior in AlphaTabRenderer
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1, Task 1.2
**Can run parallel with:** None (tests depend on implementation)

**File:** `src/components/AlphaTabRenderer.test.tsx`
**Location:** Add new describe block after existing tests

**Test Implementation:**
```typescript
describe('iOS audio activation', () => {
  beforeEach(async () => {
    render(<AlphaTabRenderer fileData={mockFileData} />);

    await waitFor(() => {
      expect(mockApiInstance.scoreLoaded.on).toHaveBeenCalled();
    });

    // Trigger score loaded
    const scoreLoadedHandler = mockApiInstance.scoreLoaded.on.mock.calls[0][0];
    act(() => {
      scoreLoadedHandler({ tracks: [] });
    });

    // Trigger playerReady to enable playback
    const playerReadyHandler = mockApiInstance.playerReady.on.mock.calls[0][0];
    act(() => {
      playerReadyHandler();
    });
  });

  it('waits for activation callback before calling play', async () => {
    let capturedCallback: (() => void) | undefined;
    const mockActivate = vi.fn((callback?: () => void) => {
      capturedCallback = callback;
    });

    // Set up player.output.activate mock
    mockApiInstance.player = {
      output: {
        activate: mockActivate,
      },
    };

    // Find and click play button
    const playButton = await screen.findByTitle('Play');
    fireEvent.click(playButton);

    // Verify activate was called but play was NOT called immediately
    expect(mockActivate).toHaveBeenCalled();
    expect(mockApiInstance.play).not.toHaveBeenCalled();

    // Simulate activation completing
    act(() => {
      capturedCallback?.();
    });

    // Now play should have been called
    expect(mockApiInstance.play).toHaveBeenCalled();
  });

  it('falls back to direct play when player.output is unavailable', async () => {
    // Set player to null (no output available)
    mockApiInstance.player = null;

    const playButton = await screen.findByTitle('Play');
    fireEvent.click(playButton);

    // Play should be called directly
    expect(mockApiInstance.play).toHaveBeenCalled();
  });

  it('attempts play in catch block when activation throws', async () => {
    const mockActivate = vi.fn(() => {
      throw new Error('Activation failed');
    });

    mockApiInstance.player = {
      output: {
        activate: mockActivate,
      },
    };

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const playButton = await screen.findByTitle('Play');

    // Should not throw
    fireEvent.click(playButton);

    // Warning should be logged
    expect(warnSpy).toHaveBeenCalledWith(
      '[AlphaTab] Audio activation warning:',
      expect.any(Error)
    );

    // Fallback play should be attempted
    expect(mockApiInstance.play).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
```

**Mock Setup Requirements:**
The existing mock in `AlphaTabRenderer.test.tsx` needs to be extended to include `player.output.activate`. Add to `MockApiInstance` interface:
```typescript
player: {
  output: {
    activate: Mock;
  };
} | null;
```

Add to `createMockApi()` factory:
```typescript
player: null, // Default to null, tests can set as needed
```

**Acceptance Criteria:**
- [ ] Test: Activation callback delays play until activation completes
- [ ] Test: Direct play when player.output is unavailable
- [ ] Test: Fallback play in catch block when activation throws
- [ ] Test: Warning logged on activation error
- [ ] All existing tests continue to pass
- [ ] Mock properly includes player.output.activate

---

## Phase 3: Manual Verification

### Task 3.1: Manual Testing on iOS Safari

**Description:** Verify the fix works on actual iOS devices
**Size:** Small
**Priority:** Critical (validation)
**Dependencies:** Task 1.2, Task 2.1
**Can run parallel with:** None

**Test Plan:**

**Critical Path - iOS Safari:**
1. Deploy to Vercel preview (branch `fix/ios-audio-activation`)
2. Open on iOS Safari (iPhone/iPad with iOS 17+)
3. Navigate to a song with a Guitar Pro file
4. Tap play button
5. **Verify audio is audible** (not just visual playback indicators)
6. Test pause/resume
7. Test seeking and resuming playback

**Regression Testing:**
1. Test on desktop Chrome
2. Test on desktop Firefox
3. Test on desktop Safari
4. Verify no playback delay or issues introduced
5. Test metronome in Practice Room on iOS Safari
6. Test HTML5 audio backing tracks still work on iOS

**Acceptance Criteria:**
- [ ] AlphaTab audio plays on iOS Safari
- [ ] Desktop Chrome works (no regression)
- [ ] Desktop Firefox works (no regression)
- [ ] Desktop Safari works (no regression)
- [ ] Pause/resume works on iOS Safari
- [ ] Seeking works on iOS Safari
- [ ] Practice Room metronome works on iOS Safari
- [ ] HTML5 audio backing tracks work on iOS Safari

---

## Execution Summary

| Phase | Tasks | Parallel Execution |
|-------|-------|-------------------|
| Phase 1 | 1.1, 1.2, 1.3 | 1.3 can run parallel with 1.1 |
| Phase 2 | 2.1 | Sequential (after 1.2) |
| Phase 3 | 3.1 | Sequential (after 2.1) |

**Critical Path:** Task 1.1 → Task 1.2 → Task 2.1 → Task 3.1

**Total Implementation Effort:** ~1-2 hours (excluding manual iOS testing)

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/components/AlphaTabRenderer.tsx` | Update interface (1.1), fix runPlaybackAction (1.2) |
| `src/components/PracticeRoom.tsx` | Add error handling (1.3) |
| `src/components/AlphaTabRenderer.test.tsx` | Add iOS activation tests (2.1) |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Callback never fires | Fallback play in catch block, else branch for missing output |
| Component unmounts during activation | Optional chaining in callback (`apiRef.current?.play()`) |
| Desktop regression | Unit tests verify existing behavior, manual regression testing |
| Test mock complexity | Extend existing mock pattern, keep tests focused |
