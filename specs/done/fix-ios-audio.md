<!-- 931441ca-b233-41f1-b7ef-8564abf6c256 ddadade9-d8b3-4aa6-a14d-93fb6ea31706 -->
# Fix iOS Safari Audio Playback

## Problem

iOS Safari requires a user gesture to unlock the Web Audio API AudioContext before audio can play. This affects:

1. **AlphaTab synthesizer** - AudioContext starts "suspended", causing silent GP playback
2. **Standalone metronome** - Creates new AudioContext per tick, same iOS issue

## Implementation

### 1. Add AlphaTab player.output type

In [src/components/AlphaTabRenderer.tsx](src/components/AlphaTabRenderer.tsx), add to `AlphaTabApi` interface:

```typescript
player: {
  output: {
    activate(): void;
  };
} | null;
```

### 2. Activate AlphaTab audio on play

In `runPlaybackAction` function, add before `apiRef.current.play()`:

```typescript
if (action === 'play' && apiRef.current.player?.output) {
  try {
    apiRef.current.player.output.activate();
  } catch (e) {
    console.warn('[AlphaTab] Audio activation warning:', e);
  }
}
```

### 3. Create shared audio utility

New file [src/lib/audioContext.ts](src/lib/audioContext.ts):

```typescript
let sharedContext: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (sharedContext) return sharedContext;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  sharedContext = new Ctor();
  return sharedContext;
}

export async function activateAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx?.state === 'suspended') await ctx.resume();
}
```

### 4. Update PracticeRoom metronome

In [src/components/PracticeRoom.tsx](src/components/PracticeRoom.tsx):

- Import shared context utilities
- Activate on metronome toggle (user gesture)
- Reuse shared context instead of creating per tick

### To-dos

- [ ] Add player.output.activate() to AlphaTabApi interface
- [ ] Call output.activate() in runPlaybackAction before play
- [ ] Create src/lib/audioContext.ts with shared context
- [ ] Update PracticeRoom metronome to use shared AudioContext
