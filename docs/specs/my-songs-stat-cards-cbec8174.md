# Specification: My Songs Infographic Stat Cards

## 1. Overview
Add informative stat cards at the top of the My Songs page to display key metrics about the user's assigned songs. The stat cards will show total assigned songs, mastered count, learning count, and total practice time, matching the visual style established in the Practice History view.

## 2. Problem Statement
Currently, the My Songs page shows only a list of assigned songs without any summary statistics. Users must manually count or mentally aggregate their progress. Practice History already has stat cards showing Total Sessions, Total Practice Time, Songs Learned, and Songs Mastered, but My Songs lacks equivalent at-a-glance metrics. Users want to quickly see:
- How many songs they are responsible for
- Their progress breakdown by status
- Their total time investment across all assigned songs

## 3. Goals
- Display 4 stat cards at the top of the My Songs page with relevant metrics
- Calculate metrics from existing data (mySongs, userSongStatuses, practiceTimePerSong)
- Match the visual styling and animation patterns used in Practice History
- Provide responsive layout (2x2 grid on mobile, 1x4 on desktop)
- Use memoization for performance to avoid recalculating on every render

## 4. Non-Goals
- Adding new data fetching or database queries (all data is already available)
- Creating new stat card variants or component modifications
- Adding click actions or navigation from stat cards
- Displaying confidence levels (out of scope for v1)
- Real-time updates without page refresh

## 5. Requirements

### 5.1 Functional Requirements
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-1 | Display "My Songs" stat card | Shows count of total songs assigned to the user with Music icon and info variant |
| FR-2 | Display "Mastered" stat card | Shows count of songs with UserSongStatus = 'Mastered' with Trophy icon and success variant |
| FR-3 | Display "Learning" stat card | Shows count of songs with UserSongStatus = 'Learning' with Target icon and warning variant |
| FR-4 | Display "Practice Time" stat card | Shows total practice time (sum of all assigned songs' practice time) formatted as "Xh Ym" with Clock icon and default variant |
| FR-5 | Responsive grid layout | Cards display in 2x2 grid on mobile (sm breakpoint) and 1x4 on desktop (lg breakpoint) |
| FR-6 | Staggered animation | Cards animate in with stagger-1 class matching Practice History pattern |

### 5.2 Technical Requirements
- Use existing `StatCard` component from `@/components/ui`
- Use existing `formatMinutesToHours` helper already defined in MySongs.tsx
- Derive all metrics from already-fetched data: `mySongs`, `userSongStatuses`, `practiceTimePerSong`
- Memoize calculated stats with `useMemo` to prevent recalculation on unrelated state changes
- Import icons from `lucide-react`: `Clock`, `Target`, `Trophy` (Music already imported)

## 6. Implementation Approach

### Architecture
- Add a single `useMemo` block to calculate all 4 stats from existing data
- Insert stat cards grid between the header and Filters Card sections
- No new components needed; reuse existing StatCard

### Key Components to Modify
- `src/components/MySongs.tsx`: Add stats calculation and stat cards grid

### Integration Points
- `mySongs` array (already computed): Source for total count and iteration
- `userSongStatuses` Map (already fetched via `useAllUserSongStatuses`): Source for status breakdown
- `practiceTimePerSong` Map (already computed from `usePracticeSessions`): Source for total practice time

### Stats Calculation Logic
```typescript
const mySongsStats = useMemo(() => {
  let mastered = 0;
  let learning = 0;
  let totalPracticeTime = 0;

  for (const item of mySongs) {
    const status = item.userStatus?.status;
    if (status === 'Mastered') mastered++;
    else if (status === 'Learning') learning++;
    totalPracticeTime += item.totalPracticeMinutes;
  }

  return {
    total: mySongs.length,
    mastered,
    learning,
    totalPracticeTime,
  };
}, [mySongs]);
```

## 7. Edge Cases and Error Handling
| Scenario | Expected Behavior |
|----------|-------------------|
| User has no songs assigned | Stat cards section is not rendered (existing "no songs assigned" view handles this) |
| User not linked to member | Stat cards section is not rendered (existing "link account" view handles this) |
| All songs are "Not Started" | Mastered and Learning show 0, which is valid |
| No practice sessions logged | Practice Time shows "0m" |
| Large practice time (>100 hours) | formatMinutesToHours correctly displays "100h 30m" format |
| User switches bands | All data refetches automatically, stats recalculate |

## 8. Testing Strategy

### Unit Tests
- Test `mySongsStats` calculation with mocked mySongs data:
  - Empty array returns all zeros
  - Mixed statuses counted correctly
  - Practice time summed correctly
- Test formatMinutesToHours edge cases (already covered in codebase)

### Integration Tests
- Verify stat cards render when user has assigned songs
- Verify stat cards do not render for unlinked users
- Verify stat cards do not render when no songs assigned
- Verify values update when song status changes

### Manual Validation
- Visual inspection of stat cards on mobile (2x2) and desktop (1x4)
- Verify animation timing matches Practice History
- Verify icon colors match variants (info=blue, success=green, warning=amber)
- Test with real data across different status distributions

## 9. Files to Modify/Create
| File | Action | Description |
|------|--------|-------------|
| src/components/MySongs.tsx | Modify | Add Clock, Target, Trophy imports; add mySongsStats useMemo; add stat cards grid section between header and filters |

## 10. Open Questions
None - all requirements are clear. The implementation follows established patterns from Practice History, uses existing components, and derives all data from already-available sources.
