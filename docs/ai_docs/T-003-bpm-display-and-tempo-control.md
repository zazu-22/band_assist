# T-003: BPM Display and Adjustable Tempo Control

**Status**: Ready for Implementation
**Priority**: High
**Estimated Effort**: 3-4 hours
**Last Updated**: 2025-11-21

## Overview

Add BPM (beats per minute) display next to the metronome and provide user-friendly tempo control through direct BPM input, slider, or both. This enhances the practice experience by allowing musicians to slow down or speed up songs to specific tempos rather than abstract percentage values.

## Current State

### Existing Implementation

- **File**: `components/AlphaTabRenderer.tsx`
- **Current Tempo Control**: Dropdown with percentage values (50%, 75%, 100%, 125%)
  - Located in toolbar between transport controls and mixer
  - Uses `Timer` icon
  - Sets `api.playbackSpeed` property (0.5 to 1.25 multiplier)
- **Metronome Display**: Visual metronome with 4 beat indicators
  - Located in toolbar
  - Uses `CircleGauge` icon
  - Shows current beat flashing in sequence

### Current Limitations

- ❌ No BPM value displayed
- ❌ No way to set specific BPM (e.g., "I want to practice at 100 BPM")
- ❌ Percentage-based control is not intuitive for musicians
- ❌ Can't see original tempo vs. practice tempo
- ❌ No way to gradually increase tempo during practice sessions

## Technical Context

### AlphaTab BPM Information

**Score Metadata**: AlphaTab provides tempo information via:
```typescript
api.score.tempo // Original BPM of the song
```

**Playback Speed**: Current implementation uses:
```typescript
api.playbackSpeed = 0.5; // 50% of original tempo
```

**Calculated BPM**:
```typescript
const currentBPM = api.score.tempo * api.playbackSpeed;
```

### Project Architecture

**Tech Stack**:
- React 19.2.0 with TypeScript
- Tailwind CSS for styling
- Lucide React for icons (Timer, CircleGauge, Music2, etc.)
- AlphaTab library for playback

**Component State** (already in AlphaTabRenderer.tsx):
- `currentSpeed` - Current playback speed multiplier (0.5-1.25)
- Need to add: `originalTempo` and `currentBPM`

## Implementation Plan

### Phase 1: Display BPM Information

#### Step 1: Extract and Store Tempo

Add state and extract tempo from score (in AlphaTabRenderer.tsx):

```typescript
// Add after existing useState declarations
const [originalTempo, setOriginalTempo] = useState<number | null>(null);
const [currentBPM, setCurrentBPM] = useState<number | null>(null);

// In handleScoreLoaded event (around line 228):
const handleScoreLoaded = (score: AlphaTabScore) => {
  if(!isMounted) return;
  console.log("[AlphaTab] Score Loaded Successfully", score);
  clearTimeout(timeoutId);
  setTracks(score.tracks);
  setCurrentTrackIndex(0);

  // NEW: Extract original tempo
  const tempo = score.tempo || 120; // Default to 120 if not specified
  setOriginalTempo(tempo);
  setCurrentBPM(tempo * currentSpeed);

  setLoading(false);
};
```

#### Step 2: Update BPM When Speed Changes

Modify the `changeSpeed` function to update BPM:

```typescript
const changeSpeed = (val: number) => {
   if(apiRef.current) {
       console.log(`[AlphaTab] Changing playback speed from ${apiRef.current.playbackSpeed} to ${val}`);
       apiRef.current.playbackSpeed = val;
       setCurrentSpeed(val);

       // NEW: Update current BPM
       if (originalTempo) {
         setCurrentBPM(Math.round(originalTempo * val));
       }

       console.log(`[AlphaTab] Playback speed is now: ${apiRef.current.playbackSpeed}`);
   }
};
```

#### Step 3: Display BPM Next to Metronome

Update the metronome UI in the toolbar (around line 662):

```typescript
{/* Visual metronome */}
{!readOnly && originalTempo && (
  <div className="flex items-center gap-2">
    {/* BPM Display */}
    <div className="flex items-center gap-1 bg-zinc-200 rounded px-3 py-1">
      <Music2 size={14} className="text-zinc-500" />
      <span className="text-sm font-semibold text-zinc-700">
        {currentBPM || originalTempo}
      </span>
      <span className="text-xs text-zinc-500">BPM</span>
    </div>

    {/* Metronome beat indicators */}
    <div className="flex items-center gap-1 bg-zinc-200 rounded px-2 py-1">
      <CircleGauge size={14} className="text-zinc-500" />
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
  </div>
)}
```

### Phase 2: Add Direct BPM Input Control

#### Option A: BPM Slider (Recommended)

Add a slider for intuitive BPM adjustment:

```typescript
const handleBPMChange = (newBPM: number) => {
  if (!originalTempo || !apiRef.current) return;

  const newSpeed = newBPM / originalTempo;
  // Clamp to supported range (0.25 to 2.0)
  const clampedSpeed = Math.max(0.25, Math.min(2.0, newSpeed));

  apiRef.current.playbackSpeed = clampedSpeed;
  setCurrentSpeed(clampedSpeed);
  setCurrentBPM(Math.round(originalTempo * clampedSpeed));
};

// In toolbar (replace or augment existing speed dropdown):
{/* BPM Slider */}
<div className="flex items-center gap-2 bg-zinc-200 rounded px-3 py-2">
  <Timer size={14} className="text-zinc-500" />
  <div className="flex flex-col gap-1">
    <input
      type="range"
      min={Math.round(originalTempo * 0.25)}
      max={Math.round(originalTempo * 2.0)}
      step="1"
      value={currentBPM || originalTempo}
      onChange={(e) => handleBPMChange(parseInt(e.target.value))}
      className="w-32 h-1 bg-zinc-300 rounded-lg appearance-none cursor-pointer accent-amber-500"
    />
    <div className="flex justify-between text-[10px] text-zinc-500">
      <span>{Math.round(originalTempo * 0.25)}</span>
      <span className="font-semibold text-zinc-700">{currentBPM}</span>
      <span>{Math.round(originalTempo * 2.0)}</span>
    </div>
  </div>
</div>
```

#### Option B: BPM Number Input

For precise control:

```typescript
{/* BPM Input */}
<div className="flex items-center gap-2 bg-zinc-200 rounded px-3 py-2">
  <Timer size={14} className="text-zinc-500" />
  <input
    type="number"
    min={Math.round(originalTempo * 0.25)}
    max={Math.round(originalTempo * 2.0)}
    value={currentBPM || ''}
    onChange={(e) => handleBPMChange(parseInt(e.target.value) || originalTempo)}
    className="w-16 bg-white border border-zinc-300 rounded px-2 py-1 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
  />
  <span className="text-xs text-zinc-500">BPM</span>
</div>
```

#### Option C: Combined Dropdown + Slider (Best UX)

Keep percentage dropdown for quick presets, add slider for fine control:

```typescript
<div className="flex items-center gap-2">
  {/* Quick Preset Dropdown */}
  <div className="flex items-center gap-1 bg-zinc-200 rounded px-2 py-1">
    <Timer size={14} className="text-zinc-500" />
    <select
      value={currentSpeed}
      onChange={(e) => changeSpeed(parseFloat(e.target.value))}
      className="bg-transparent text-sm outline-none w-16"
    >
      <option value={0.5}>50%</option>
      <option value={0.75}>75%</option>
      <option value={1.0}>100%</option>
      <option value={1.25}>125%</option>
    </select>
  </div>

  {/* Fine Control Slider */}
  {originalTempo && (
    <div className="flex items-center gap-2 bg-zinc-200 rounded px-3 py-1">
      <input
        type="range"
        min={Math.round(originalTempo * 0.25)}
        max={Math.round(originalTempo * 2.0)}
        step="5"
        value={currentBPM || originalTempo}
        onChange={(e) => handleBPMChange(parseInt(e.target.value))}
        className="w-24 h-1 accent-amber-500"
      />
      <span className="text-xs font-mono text-zinc-700 w-12 text-center">
        {currentBPM} BPM
      </span>
    </div>
  )}
</div>
```

### Phase 3: Practice-Friendly Enhancements

#### 3.1 BPM Increment Buttons

Add ±5 BPM buttons for gradual tempo increases:

```typescript
<div className="flex items-center gap-1">
  <button
    onClick={() => handleBPMChange((currentBPM || originalTempo) - 5)}
    className="w-6 h-6 rounded bg-zinc-300 hover:bg-zinc-400 text-zinc-700 font-bold text-sm"
    title="Decrease 5 BPM"
  >
    −
  </button>
  <span className="text-sm font-semibold text-zinc-700 w-16 text-center">
    {currentBPM} BPM
  </span>
  <button
    onClick={() => handleBPMChange((currentBPM || originalTempo) + 5)}
    className="w-6 h-6 rounded bg-zinc-300 hover:bg-zinc-400 text-zinc-700 font-bold text-sm"
    title="Increase 5 BPM"
  >
    +
  </button>
</div>
```

#### 3.2 Reset to Original Button

Quick way to return to 100% tempo:

```typescript
{currentSpeed !== 1.0 && (
  <button
    onClick={() => changeSpeed(1.0)}
    className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-semibold"
    title="Reset to original tempo"
  >
    Reset
  </button>
)}
```

#### 3.3 Practice Mode Tempo Ramp

Future enhancement: Gradually increase tempo over practice session:

```typescript
// Store in component state
const [targetBPM, setTargetBPM] = useState<number | null>(null);
const [rampDuration, setRampDuration] = useState<number>(60); // seconds

// Implement gradual increase using setInterval
// (Out of scope for this ticket - create T-005 if needed)
```

## UI/UX Design

### Current Toolbar Layout

```
[Left Section: Transport Controls]
- Play/Pause
- Stop
- Loop

[Center Section: Track Selector]
- 🟠 Current Track Name (clickable)

[Right Section: Tempo & Mixer]
- Metronome (🎚️ + beat indicators)
- Speed dropdown (⏲️ + %)
- AlphaTab label
```

### Proposed Layout (Option 1 - Minimal)

```
[Left Section: Transport Controls]
[Center Section: Track Selector]
[Right Section: Tempo & Mixer]
- BPM Display (🎵 120 BPM)
- Metronome (🎚️ + beat indicators)
- Speed dropdown (⏲️ + %)
- AlphaTab label
```

### Proposed Layout (Option 2 - Full Control)

```
[Left Section: Transport Controls]
[Center Section: Track Selector]
[Right Section: Tempo & Mixer]
- BPM Controls (− 120 BPM +) or (slider)
- Metronome (🎚️ + beat indicators)
- AlphaTab label
```

**Recommendation**: Option 2 with slider - removes percentage dropdown, replaces with BPM slider for more intuitive control.

## Testing Plan

### Functional Testing

- [ ] BPM displays correctly on file load
- [ ] BPM updates when speed changes via dropdown
- [ ] BPM updates when speed changes via slider/input
- [ ] Slider range respects 0.25x to 2.0x limits
- [ ] BPM calculation is accurate (tempo × speed)
- [ ] Reset button returns to original tempo
- [ ] Increment buttons work (±5 BPM)

### Edge Cases

- [ ] Files without tempo metadata (should default to 120 BPM)
- [ ] Tempo changes mid-song (AlphaTab limitation - use first tempo)
- [ ] Very slow tempos (< 40 BPM)
- [ ] Very fast tempos (> 300 BPM)
- [ ] Switching between different files with different tempos

### UI/UX Testing

- [ ] BPM display is readable and prominent
- [ ] Controls are intuitive for musicians
- [ ] Slider feels responsive (not laggy)
- [ ] Layout doesn't break on smaller screens
- [ ] All icons and labels are clear

## Known Issues & Limitations

1. **Mid-Song Tempo Changes**: AlphaTab provides a single `score.tempo` value. Songs with tempo changes will only show the first tempo. The playback speed multiplier affects the entire song.

2. **Time Signature Changes**: Songs with multiple time signatures will show BPM for all, but metronome visual always shows 4 beats.

3. **Decimal BPM**: Some songs have fractional tempos (e.g., 120.5 BPM). We round to nearest integer for display simplicity.

4. **Minimum/Maximum Range**: AlphaTab supports 0.25x to 2.0x speed. Very slow/fast tempos might sound distorted at extreme ranges.

## Future Enhancements (Out of Scope)

- **Tempo Ramp**: Gradually increase BPM over practice session
- **Tap Tempo**: Tap button to set BPM
- **Metronome Volume**: Separate volume control for click track
- **Visual Tempo Graph**: Show tempo changes throughout song
- **Practice History**: Track which tempos were used for practice
- **Keyboard Shortcuts**: [ and ] to decrease/increase BPM

## Resources

### AlphaTab API

- Score Object: <https://alphatab.net/docs/reference/score>
- Playback Speed: <https://alphatab.net/docs/reference/api/#playbackspeed>

### Music Theory

- BPM (Beats Per Minute): Standard unit for tempo in music
- Typical ranges: Slow (40-80), Moderate (80-120), Fast (120-200), Very Fast (200+)

## Acceptance Criteria

1. ✅ BPM value displayed prominently next to metronome
2. ✅ BPM updates accurately when speed changes
3. ✅ User can adjust tempo via intuitive control (slider or +/- buttons)
4. ✅ Original tempo extracted from score correctly
5. ✅ BPM display shows current tempo (not just original)
6. ✅ Layout is clean and doesn't overwhelm toolbar
7. ✅ All testing checklist items pass
8. ✅ Works across all usage contexts (Practice Room, Song Detail, Performance Mode)

---

**Files to Modify:**
- `components/AlphaTabRenderer.tsx` - Main implementation
- Possibly: Add new icons to imports if using different visual indicators

**Estimated Lines of Code:** ~100 lines (state management + UI + handlers)
