# Fix: Performance Mode Chart Switch Flicker

Created: 2025-12-02
Status: Backlog

## Summary

Brief UI flicker occurs when switching between songs that have different chart types (e.g., PDF to AlphaTab).

## Problem

When navigating between songs where one has a PDF/text chart and another has an AlphaTab chart:

1. The toolbar momentarily shows PDF-specific controls (auto-scroll, metronome)
2. Then the AlphaTab viewer loads and those controls disappear
3. Creates a jarring visual flash during song transitions

## Root Cause

The `isGuitarPro` check depends on `activeChart`, which updates after the song change triggers a re-render. The sequence is:

1. Song changes → `currentSong` updates
2. `useEffect` resets `activeChartId` to first chart
3. `activeChart` derived from new `activeChartId`
4. `isGuitarPro` recalculates
5. Toolbar re-renders with correct controls

During steps 1-4, there's a brief moment where the old chart type may still be referenced.

## Proposed Solutions

1. **Synchronous chart type detection** - Derive chart type directly from `currentSong.charts[0]` instead of waiting for state update
2. **Loading state** - Show neutral toolbar during transition
3. **Memoize chart type** - Ensure `isGuitarPro` updates atomically with song change

## Files Likely Affected

- `src/components/PerformanceMode.tsx`

## Acceptance Criteria

- [ ] No toolbar flicker when switching between songs
- [ ] Smooth transition regardless of chart type change
- [ ] No regression in chart loading behavior
