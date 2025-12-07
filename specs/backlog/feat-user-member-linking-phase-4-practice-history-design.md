# Feature: Practice History Design System Integration (Phase 4)

| Field       | Value                                       |
| ----------- | ------------------------------------------- |
| **Status**  | Backlog                                     |
| **Authors** | Claude (AI Assistant)                       |
| **Created** | 2025-12-07                                  |
| **Updated** | 2025-12-07                                  |
| **Priority**| Low                                         |
| **Type**    | Feature                                     |

---

## Summary

Apply design system conventions to the Practice History page to ensure visual consistency with the rest of the application. The page was implemented in Phase 2 with functional requirements complete, but styling needs refinement.

---

## Problem

The Practice History page (`/practice-history`) introduced in Phase 2:

- Does not fully follow the established design aesthetic
- May have inconsistent spacing, card styling, or typography
- Could benefit from the polish applied to other pages (Dashboard, Song Detail, etc.)

---

## Proposed Solution

Apply design system conventions from existing polished pages:

### 1. Card Styling

- Match stat card styling to Dashboard (`StatCard` component)
- Ensure consistent border radius, shadows, and hover states
- Use proper spacing tokens

### 2. Table Styling

- Match table styling to existing patterns (SetlistManager, ScheduleManager)
- Ensure consistent row heights and cell padding
- Apply proper responsive behavior for mobile

### 3. Typography

- Use consistent heading hierarchy
- Apply proper text colors and sizes from design tokens
- Ensure muted text uses correct opacity

### 4. Filter Controls

- Style select dropdowns and date inputs consistently
- Ensure proper spacing between filter elements
- Match responsive behavior of other filter UI

### 5. Empty States

- Use `EmptyState` component for "no sessions" case
- Match messaging style to other empty states

### 6. Responsive Layout

- Ensure stats grid works well on mobile
- Table should be scrollable or collapse gracefully
- Filter controls should stack appropriately

---

## Files Likely Affected

- `/src/components/PracticeHistory.tsx`
- Possibly extract subcomponents if needed for reuse

---

## Acceptance Criteria

- [ ] Stat cards match Dashboard styling patterns
- [ ] Table matches existing table patterns (hover states, borders)
- [ ] Typography follows design system hierarchy
- [ ] Filter controls styled consistently with other filters
- [ ] Empty state uses standard `EmptyState` component
- [ ] Responsive layout works on mobile
- [ ] Dark mode renders correctly

---

## Dependencies

- **Requires**: Phase 2 (Practice History implementation) - Complete

---

## Effort Estimate

**Small** (1-3 hours) - Styling refinement only, no new functionality

---

## Notes

This is a polish pass, not a functional change. The Practice History page works correctly; this spec addresses visual consistency with the design system established in earlier design phases.
