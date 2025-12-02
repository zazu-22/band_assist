# Feature: AlphaTab Metronome in Performance Mode

Created: 2025-12-02
Status: Backlog

## Summary

Performance Mode provides a visual metronome for text/PDF charts but not for AlphaTab (Guitar Pro) charts, creating an inconsistent experience.

## Problem

- When viewing text or PDF charts, users have access to a visual metronome indicator
- When viewing AlphaTab charts, the metronome UI is hidden entirely
- AlphaTab has its own playback with timing, but no standalone metronome for practice/warmup
- Users may want metronome before starting AlphaTab playback

## Current Behavior

```tsx
{!isGuitarPro && (
  <>
    {/* Auto-scroll controls */}
    {/* Metronome indicator */}
  </>
)}
```

The metronome is conditionally hidden when `isGuitarPro` is true.

## Proposed Solution

Options to consider:

1. **Enable visual metronome for AlphaTab** - Show the same metronome UI, useful before playback starts
2. **Integrate with AlphaTab's metronome** - AlphaTab may have built-in metronome/count-in features
3. **Hybrid approach** - Show standalone metronome when AlphaTab playback is stopped, hide during playback

## Files Likely Affected

- `src/components/PerformanceMode.tsx`
- `src/components/AlphaTabRenderer.tsx` (if integrating with AlphaTab's features)

## Acceptance Criteria

- [ ] Metronome functionality available when viewing AlphaTab charts
- [ ] Clear UX for when metronome is active vs AlphaTab playback
- [ ] BPM synced with song's BPM setting
