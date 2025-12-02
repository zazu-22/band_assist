# Feature: Setlist Analytics

| Field | Value |
| ----- | ----- |
| **Status** | Backlog |
| **Priority** | Medium |
| **Type** | Feature |
| **Created** | 2025-12-02 |

---

## Summary

Analyze setlist composition by visualizing tempo distribution, key changes, and energy flow across songs. Add an `energyLevel` field to songs (1-5 scale) and provide recommendations for optimal song ordering to maintain audience engagement.

## Problem

- No visibility into setlist pacing or energy dynamics
- Cannot see tempo/key distribution patterns
- Difficult to identify potential issues like too many slow songs in a row
- No data-driven guidance for setlist ordering
- Tempo jumps or monotonous energy levels go unnoticed until performance
- Total duration exists but lacks context on pacing

## Proposed Solution

Add analytics and visualization to SetlistManager:

**Schema Changes:**
- Add `energy_level` field to `songs` table:
  - Type: integer (1-5 scale)
  - 1 = Ballad/Very Slow, 2 = Mellow, 3 = Moderate, 4 = Upbeat, 5 = High Energy
  - Nullable (optional field)

**Analytics Components:**
- `SetlistAnalytics` component showing:
  - **Energy Flow Chart**: Line graph showing energy levels across setlist
  - **Tempo Distribution**: Histogram or scatter plot of BPM values
  - **Key Changes Map**: Visual showing key transitions (circle of fifths reference)
  - **Duration Timeline**: Stacked bar showing cumulative time with segment markers
  - **Summary Stats**: Avg BPM, avg energy, total duration, key diversity score

**Recommendations Engine:**
- Detect patterns that may need attention:
  - 3+ consecutive songs with same energy level
  - Sudden energy drops (4→1 or 5→2 transitions)
  - BPM jumps >40 between adjacent songs
  - Too many songs in same key consecutively
  - Unbalanced first/second half energy distribution
- Display recommendations with severity (info/warning)
- One-click "Optimize Setlist" feature (v2) using algorithm

**UI Integration:**
- Toggle "Analytics View" in SetlistManager
- Mini analytics panel always visible (summary stats)
- Detailed analytics in expandable section or modal
- Color-coded warnings in setlist song cards

## Files Likely Affected

- `src/types.ts` - Add `energyLevel?: number` to Song interface
- `src/types/database.types.ts` - Updated after migration
- `src/components/SetlistManager.tsx` - Integrate analytics panel
- `src/components/setlist/SetlistAnalytics.tsx` - New component
- `src/components/setlist/EnergyFlowChart.tsx` - New component
- `src/components/setlist/SetlistRecommendations.tsx` - New component
- `src/components/SongEditor.tsx` - Add energy level selector (1-5 radio/slider)
- `src/lib/setlistAnalytics.ts` - Analytics calculation utilities (new file)
- `src/services/supabaseStorageService.ts` - Update song type mappings
- `supabase/migrations/` - Add energy_level column to songs table

## Acceptance Criteria

- [ ] `energy_level` column added to songs table (integer, nullable, check constraint 1-5)
- [ ] Song editor includes energy level selector (1-5 scale with labels)
- [ ] SetlistManager shows analytics toggle button
- [ ] Energy flow chart displays as line graph with song titles on x-axis
- [ ] Tempo distribution shows BPM values across setlist
- [ ] Key changes map highlights transitions (color-coded by interval distance)
- [ ] Duration timeline shows cumulative time with visual segments
- [ ] Summary statistics calculate and display correctly
- [ ] Recommendations detect problematic patterns (consecutive energy, big jumps)
- [ ] Recommendations display with appropriate severity levels
- [ ] Analytics handle missing data gracefully (null energy, BPM, key values)
- [ ] Mobile-responsive analytics view (scrollable/collapsible)
- [ ] Empty state when setlist has no songs
- [ ] Chart tooltips show song details on hover

## Dependencies

- Songs have `bpm`, `key`, and `duration` fields populated
- SetlistManager component exists
- Charting library (consider: recharts, chart.js, or D3 for visualizations)
- Song editor functionality for setting energy levels
