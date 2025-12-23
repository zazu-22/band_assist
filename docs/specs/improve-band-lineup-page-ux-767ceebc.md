# Specification: Improve Band Lineup Page UX

## 1. Overview

Redesign the Band Lineup page (`/band`) to eliminate wasted space, fix mobile layout issues, and provide useful at-a-glance information about band member roles and practice activity. The page will adopt patterns from the Dashboard and My Songs pages to create a more consistent, information-rich experience.

## 2. Problem Statement

The current Band Lineup page has several UX issues that reduce its utility:

1. **Dead Space**: When no member is selected, a large dashed-border placeholder shows "Select a band member above to view their personalized setlist." This wastes valuable screen real estate and provides no useful information.

2. **Mobile Cutoff**: The detail view uses `flex-1 flex flex-col overflow-hidden` within a `h-full flex flex-col` container. On mobile viewports, the detail card gets cut off at the bottom because the container height calculation does not account for the header and member grid.

3. **Limited Information**: Member cards only show name and role count. The "Gig Sheet" only shows song title, key/BPM, roles, and special parts. There is no visibility into:
   - Which instruments each member plays
   - Practice activity or engagement
   - Song status breakdown
   - Learning progress

4. **Inconsistent with Recent Improvements**: Other pages (Dashboard, My Songs) have been enhanced with stat cards, progress indicators, tooltips, and rich data displays. The Band Lineup page lacks these patterns.

## 3. Goals

- Eliminate the empty placeholder state by showing useful summary information immediately
- Fix mobile layout so content does not get cut off
- Add at-a-glance stats about the band (total songs, readiness breakdown, member coverage)
- Show more useful information on member cards (instruments, song count, practice activity)
- Improve the member detail view with stats and better organization
- Align visual patterns with Dashboard and My Songs pages (stat cards, tooltips, animations)

## 4. Non-Goals

- Adding new data to the database (use existing data structures)
- Changing the member selection interaction (still click to select)
- Adding filtering or search functionality (future enhancement)
- Changing the underlying navigation or route structure
- Adding member management (that stays in Settings)

## 5. Requirements

### 5.1 Functional Requirements

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-1 | Replace empty placeholder with band summary card | When no member selected, show a "Band Overview" card with total members, total songs, readiness stats, and coverage info |
| FR-2 | Fix mobile viewport cutoff | Member detail view scrolls properly on mobile without content being cut off; no content hidden behind the bottom of the screen |
| FR-3 | Show member instruments on cards | Each member card displays their primary instrument(s) from their roles array |
| FR-4 | Show song count on member cards | Each member card shows "X songs" count based on their assignments |
| FR-5 | Add band-level stat cards | Display 3-4 stat cards above member grid: Total Members, Total Songs, Performance Ready %, Coverage (unassigned songs) |
| FR-6 | Improve Gig Sheet detail view | Show member-specific stats (mastered/learning breakdown if data available), better song card layout, practice button per song |
| FR-7 | Add tooltips for stat values | Hovering stat cards shows explanation text (e.g., "Songs marked Performance Ready") |
| FR-8 | Apply staggered entrance animations | Member cards and stat cards animate in with staggered delays per design system |

### 5.2 Technical Requirements

- Use existing `BandMember`, `Song`, and `Assignment` types from `/Users/jason/code/personal/band_assist/src/types.ts`
- Leverage existing `StatCard` component from `/Users/jason/code/personal/band_assist/src/components/ui/StatCard.tsx`
- Follow design system patterns from `/Users/jason/code/personal/band_assist/docs/design-system.md`
- Use responsive Tailwind classes for mobile-first layout
- Memoize computed values with `useMemo` for performance

## 6. Implementation Approach

### Layout Restructure

Replace the current two-part layout (member grid + detail/placeholder) with a three-section layout:

```
+------------------------------------------+
| Header: "Band Lineup"                    |
+------------------------------------------+
| Stat Cards Row (3-4 cards)               |
+------------------------------------------+
| Member Grid (2-4 columns responsive)     |
+------------------------------------------+
| Member Detail Card (when selected) OR    |
| Band Overview Card (when no selection)   |
+------------------------------------------+
```

### Mobile Fix

Replace `h-full flex flex-col` container with `min-h-0 flex flex-col overflow-y-auto` and remove fixed heights. Use `flex-shrink-0` on the header and stat sections to ensure they remain visible while the lower section scrolls.

### Key Components

1. **BandStatCards**: A row of stat cards showing:
   - Total Members (Users icon, default variant)
   - Total Songs (Music icon, info variant)
   - Performance Ready % (CheckCircle icon, success variant)
   - Needs Assignment (AlertTriangle icon, warning variant if > 0)

2. **Enhanced Member Card**: Extend current card to show:
   - Avatar with initial (existing)
   - Name (existing)
   - Primary instrument badge (from `member.roles[0]` or `member.preferredInstrument`)
   - Song count with icon

3. **Band Overview Card** (replaces empty placeholder): Shows when no member selected:
   - Band readiness breakdown (like Dashboard's Band Readiness card)
   - Quick links: "Go to Dashboard", "View Schedule"
   - Coverage warning if unassigned songs exist

4. **Enhanced Gig Sheet**: When member selected:
   - Header with avatar, name, song count, and role list
   - Song cards with Practice button
   - Better responsive grid (1 col mobile, 2 cols md, 3 cols lg)

## 7. Edge Cases and Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Zero members in band | Show EmptyState: "No band members - Add members in Settings" with action button |
| Zero songs in band | Stat cards show 0 values; Member detail shows "No songs yet" message |
| Member with no assignments | Card shows "0 songs"; Gig Sheet shows "No songs assigned yet" with instruction |
| Member with deleted/missing member reference | Filter out invalid assignments; do not crash |
| Very long member name | Truncate with ellipsis on card; show full name in detail header |
| Large number of members (10+) | Grid remains responsive; consider virtual scrolling in future |
| Mobile viewport < 375px | Cards stack to single column; no horizontal overflow |

## 8. Testing Strategy

**Unit tests:**
- Test stat calculation functions (getMemberRoleCount, readiness percentage)
- Test member filtering logic for assignments
- Verify StatCard renders correct variant and values

**Integration tests:**
- Render BandDashboard with mock data, verify stat cards display correct counts
- Click member card, verify Gig Sheet appears with correct songs
- Verify mobile layout: detail card is scrollable, not cut off
- Verify empty states render correctly for zero members and zero songs

**Manual validation:**
- Test on iOS Safari (real device or simulator) to verify no mobile cutoff
- Test with 1, 4, 8, and 12 band members to verify grid responsiveness
- Verify animations play smoothly without jank
- Check dark mode styling consistency

## 9. Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `/Users/jason/code/personal/band_assist/src/components/BandDashboard.tsx` | Modify | Restructure layout, add stat cards, fix mobile overflow, enhance member cards and detail view |
| `/Users/jason/code/personal/band_assist/src/components/BandDashboard.test.tsx` | Create | Add unit and integration tests for new functionality |

## 10. Open Questions

None - all requirements are clear based on existing patterns in the codebase. The implementation will leverage existing components (StatCard, EmptyState, Card, Avatar) and follow established design system patterns.
