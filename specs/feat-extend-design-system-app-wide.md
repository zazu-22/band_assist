# Extend Design System to Remaining Application Components

| Field       | Value                                                     |
| ----------- | --------------------------------------------------------- |
| **Status**  | Superseded                                                |
| **Authors** | Claude (AI Assistant)                                     |
| **Created** | 2025-11-29                                                |
| **Updated** | 2025-11-29                                                |

> **Note:** This spec has been split into 4 phase-specific specs for implementation:
> - `specs/design-system-phase1-high-impact.md` - ScheduleManager, BandDashboard, Settings
> - `specs/design-system-phase2-detail-pages.md` - SongDetail, InvitationManager
> - `specs/design-system-phase3-performance-mode.md` - PerformanceMode
> - `specs/design-system-phase4-polish-qa.md` - Final QA & Documentation

---

## Overview

This specification outlines the systematic extension of the established Band Assist design system (documented in `docs/design-system.md`) to all remaining application components. The design system has been successfully implemented in Dashboard, PracticeRoom, and SetlistManager, creating a cohesive "Backstage Command Center" aesthetic. This effort will bring the same visual consistency, interaction patterns, and polish to the remaining 6 major page-level components.

---

## Background/Problem Statement

### Current State

The Band Assist application has evolved organically, resulting in inconsistent visual treatment across different pages:

1. **Design System Compliant (3 components):**
   - `Dashboard.tsx` - Full implementation of design patterns
   - `PracticeRoom.tsx` - Full implementation with animations
   - `SetlistManager.tsx` + sub-components - Full implementation with drag/drop

2. **Partially Compliant (2 components):**
   - `SongDetail.tsx` - Uses some patterns (serif headlines, tab navigation) but inconsistently
   - `InvitationManager.tsx` - Nested component with custom badge styling

3. **Non-Compliant (4 components):**
   - `ScheduleManager.tsx` - Basic styling, no serif typography, no animations
   - `BandDashboard.tsx` - Basic styling, missing ambient effects
   - `Settings.tsx` - Functional but lacks design system polish
   - `PerformanceMode.tsx` - Custom dark theme, inconsistent with patterns

### Core Problem

Users experience visual inconsistency when navigating between polished pages (Dashboard, Setlist) and unpolished pages (Schedule, Settings). This creates a fragmented user experience that undermines the professional "backstage" aesthetic.

### Root Cause

- Design system was established during Dashboard redesign but not retroactively applied
- Components were built at different times with different styling approaches
- No systematic audit ensured consistency across the application

---

## Goals

- **Visual Consistency:** Apply unified typography, colors, spacing, and animations across all pages
- **Pattern Reuse:** Leverage existing design system components and utilities to reduce duplication
- **Improved UX:** Polished animations and hover states create a more responsive, professional feel
- **Mobile Accessibility:** Ensure all interactive elements meet 44px touch target requirements
- **Maintainability:** Extract reusable patterns into shared components where beneficial

---

## Non-Goals

- **New Features:** This effort focuses on styling, not functionality changes
- **Auth Pages Overhaul:** Login/Signup/PasswordReset get minimal updates (lower priority)
- **PerformanceMode Redesign:** This has intentional dark theme for stage use; only targeted improvements
- **Component Refactoring:** We style existing components, not restructure them (unless trivially beneficial)
- **New Shared Components:** Only extract if clearly reusable across 3+ locations

---

## Technical Dependencies

| Dependency           | Version | Usage                                      |
| -------------------- | ------- | ------------------------------------------ |
| Tailwind CSS         | 4.x     | Utility classes, animations                |
| React                | 19.x    | Component architecture                     |
| Radix UI / shadcn/ui | latest  | Primitive components                       |
| lucide-react         | latest  | Icons                                      |

### Existing Design System Assets

**CSS Animations (in `index.css`):**
- `animate-slide-in-from-bottom` - Entrance animation
- `animate-progress-fill` - Progress bar fill
- `animate-pulse-glow` - Countdown badge glow
- `.animation-forwards` - Maintains final state
- `.stagger-1` through `.stagger-5` - Staggered delays

**Shared Components:**
- `StatusBadge` - Song status indicator (`ui/StatusBadge.tsx`)
- `EmptyState` - Empty state placeholder (`ui/EmptyState.tsx`)
- `ConfirmDialog` - Confirmation modals (`ui/ConfirmDialog.tsx`)
- Primitives: Card, Button, Badge, Input, Select, Tooltip, etc.

**CSS Variables (semantic colors):**
- `--primary` - Amber/gold brand color
- `--success` - Green (Stage Ready)
- `--info` - Blue (In Progress)
- `--warning` - Amber (To Learn)
- `--destructive` - Red (errors/overdue)

---

## Detailed Design

### Design System Patterns to Apply

#### 1. Typography Hierarchy

```tsx
// Page headline (h2)
<h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">

// Section title (h3 in cards)
<h3 className="text-lg font-serif text-foreground">

// Label/caption
<span className="text-xs text-muted-foreground uppercase tracking-wide">

// Stat/metric display
<span className="text-3xl font-bold font-mono tabular-nums">
```

#### 2. Card Header Pattern

```tsx
<CardHeader className="py-2.5 px-4">
  <div className="flex items-center justify-between">
    <h3 className="text-lg font-serif text-foreground">Section Title</h3>
    <Button variant="ghost" size="sm" className="h-7 text-xs">
      Action
    </Button>
  </div>
</CardHeader>
```

#### 3. List Item Pattern

```tsx
<div className="flex items-center gap-4 px-4 py-2.5 border-l-[3px] border-l-primary/60 hover:bg-muted/30 transition-colors">
  {/* Content */}
</div>
```

#### 4. Ambient Background Glow

```tsx
<div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
  <div
    className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-[0.03]"
    style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }}
  />
</div>
```

#### 5. Entrance Animations

```tsx
// Single element with stagger class
<Card className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-1">

// List items with dynamic delay
<li style={{ animationDelay: `${index * 50}ms` }}
    className="animate-slide-in-from-bottom animation-forwards opacity-0">
```

---

### Component-by-Component Implementation

---

### 1. ScheduleManager.tsx

**Current Issues:**
- Basic headline: `text-3xl font-bold` (missing `font-serif`, `tracking-tight`)
- No ambient glow background
- No entrance animations for timeline items
- Timeline items use basic card styling, not list item pattern
- Time displays not using `font-mono tabular-nums`

**Required Changes:**

**A. Header Section (Lines 176-184)**
```diff
- <h2 className="text-3xl font-bold text-foreground">Band Schedule</h2>
+ <h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">Band Schedule</h2>
```

**B. Add Ambient Glow (After opening `<div>` in return)**
```tsx
{/* Ambient background glow */}
<div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
  <div
    className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-[0.03]"
    style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }}
  />
</div>
```

**C. Timeline Dot Colors (Lines 289-294)**
Already uses semantic colors (`bg-primary`, `bg-destructive`, `bg-info`) - keep as is.

**D. Time Display (Lines 347-350)**
```diff
- <div className="text-xs text-muted-foreground font-mono mt-1">
+ <div className="text-xs text-muted-foreground font-mono tabular-nums mt-1">
```

**E. Date Display (Lines 341-346)**
```diff
- <div className="text-2xl font-bold text-foreground leading-none">
+ <div className="text-2xl font-bold font-mono tabular-nums text-foreground leading-none">
```

**F. Timeline Items Animation (Line 297)**
Add staggered entrance animation to timeline items:
```diff
- <div key={item.id} className={`relative ${isPast ? 'opacity-50 grayscale' : ''}`}>
+ <div
+   key={item.id}
+   className={cn(
+     'relative',
+     'animate-slide-in-from-bottom animation-forwards opacity-0',
+     isPast && 'grayscale'
+   )}
+   style={{ animationDelay: `${index * 75}ms` }}
+ >
```
Note: Need to get index from map function.

**G. Card Header Pattern for Form (Lines 188-189)**
```diff
  <CardHeader>
-   <CardTitle>{editingId ? 'Edit Event' : 'New Event'}</CardTitle>
+   <CardTitle className="font-serif">{editingId ? 'Edit Event' : 'New Event'}</CardTitle>
  </CardHeader>
```

**H. Event Type Labels (Line 311)**
Already uses proper styling (`text-xs font-bold uppercase tracking-wider`) - keep as is.

---

### 2. BandDashboard.tsx

**Current Issues:**
- Basic headline: `text-3xl font-bold` (missing `font-serif`)
- No ambient glow background
- No entrance animations for member cards
- Member cards missing left-border accent on selected state
- Role count not using monospace numbers

**Required Changes:**

**A. Header Section (Lines 80-85)**
```diff
- <h2 className="text-3xl font-bold text-foreground">Band Lineup</h2>
+ <h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">Band Lineup</h2>
```

**B. Add Ambient Glow (After opening `<div>` in return)**
```tsx
{/* Ambient background glow */}
<div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
  <div
    className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-[0.03]"
    style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }}
  />
</div>
```
Note: Parent div needs `relative` class.

**C. Member Card Grid Animation (Line 99)**
```diff
- <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
+ <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8 animate-slide-in-from-bottom animation-forwards opacity-0 stagger-1">
```

**D. Individual Card Animation (Lines 105-127)**
Add staggered animation to each card:
```tsx
<Card
  key={member.id}
  className={cn(
    'relative overflow-hidden cursor-pointer transition-all duration-200 group',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'animate-slide-in-from-bottom animation-forwards opacity-0',
    isSelected
      ? 'ring-2 ring-primary shadow-lg border-l-[3px] border-l-primary'
      : 'hover:bg-muted/50 hover:border-border/80'
  )}
  style={{ animationDelay: `${index * 75}ms` }}
  // ... rest of props
>
```
Note: Need to get index from map function.

**E. Role Count Monospace (Lines 140-142)**
```diff
- <p className="text-xs text-muted-foreground mt-1">
-   {roleCount} Active Role{roleCount !== 1 ? 's' : ''}
- </p>
+ <p className="text-xs text-muted-foreground mt-1">
+   <span className="font-mono tabular-nums">{roleCount}</span> Active Role{roleCount !== 1 ? 's' : ''}
+ </p>
```

**F. Detail View Card Title (Line 164)**
```diff
- <CardTitle className="text-xl">{selectedMember.name}&apos;s Gig Sheet</CardTitle>
+ <CardTitle className="text-xl font-serif">{selectedMember.name}&apos;s Gig Sheet</CardTitle>
```

**G. Song Card BPM (Line 205)**
```diff
- {song.key} • {song.bpm} BPM
+ {song.key} • <span className="font-mono tabular-nums">{song.bpm}</span> BPM
```

---

### 3. Settings.tsx

**Current Issues:**
- Basic headline: `text-3xl font-bold` (missing `font-serif`)
- Tab content lacks entrance animations (has `animate-fade-in` but could use slide)
- Member list items missing left-border accent pattern
- Role badges functional but could use consistent hover pattern
- Form inputs don't explicitly use touch target classes

**Required Changes:**

**A. Header Section (Lines 225-228)**
```diff
- <h2 className="text-3xl font-bold text-foreground">Configuration</h2>
+ <h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">Configuration</h2>
```

**B. Tab Content Animation (Lines 253, 357, 401, 415)**
Enhance existing `animate-fade-in` or replace:
```diff
- <TabsContent value="ROSTER" className="space-y-6 animate-fade-in">
+ <TabsContent value="ROSTER" className="space-y-6 animate-slide-in-from-bottom animation-forwards">
```

**C. Card Titles (Lines 256, 360, 418)**
```diff
- <CardTitle>Members</CardTitle>
+ <CardTitle className="font-serif">Members</CardTitle>
```

**D. Member List Item Pattern (Lines 265-268)**
```diff
- <div
-   key={member.id}
-   className="bg-muted/50 p-4 rounded-lg border border-border flex items-center justify-between"
- >
+ <div
+   key={member.id}
+   className={cn(
+     'p-4 rounded-lg border border-border flex items-center justify-between',
+     'border-l-[3px] border-l-primary/60 hover:bg-muted/30 transition-colors'
+   )}
+ >
```

**E. Export/Import Card Titles (Lines 434, 455)**
```diff
- <h4 className="font-bold text-foreground">Export Project</h4>
+ <h4 className="font-bold font-serif text-foreground">Export Project</h4>
```

**F. Warning Card Title (Line 484)**
```diff
- <h4 className="font-bold text-destructive">Local Storage Warning</h4>
+ <h4 className="font-bold font-serif text-destructive">Local Storage Warning</h4>
```

---

### 4. SongDetail.tsx

**Current Issues:**
- Song title uses serif but is only `text-2xl` (should be larger or consistent)
- Metadata cards already use `font-mono tabular-nums` - good
- Tab navigation implements design system pattern - good
- Some section headers use serif, others don't
- AI Assistant sidebar could use consistent card styling

**Required Changes:**

**A. Song Title (Line 400)**
```diff
- <h2 className="text-2xl font-bold font-serif text-foreground flex items-center gap-3">
+ <h2 className="text-3xl font-bold font-serif text-foreground tracking-tight flex items-center gap-3">
```

**B. AI Assistant Sidebar Header (Lines 1057-1062)**
```diff
- <h3 className="font-bold text-foreground flex items-center gap-2">
+ <h3 className="text-lg font-bold font-serif text-foreground flex items-center gap-2">
```

**C. Assignments Card Title (Line 856)**
```diff
- <h3 className="text-xl font-serif text-foreground">Band Assignments</h3>
+ <h3 className="text-xl font-bold font-serif text-foreground">Band Assignments</h3>
```

**D. Member Assignment Cards (Lines 870-887)**
Add left-border accent to member cards:
```diff
- <div
-   key={member.id}
-   className="bg-muted/30 border border-border rounded-xl p-5 flex flex-col h-full"
- >
+ <div
+   key={member.id}
+   className={cn(
+     'border border-border rounded-xl p-5 flex flex-col h-full',
+     'border-l-[3px] border-l-primary/60 hover:bg-muted/20 transition-colors'
+   )}
+ >
```

**E. Audio Card Title (Lines 987-989, 1030)**
```diff
- <h3 className="text-2xl font-bold font-serif text-foreground">
+ <h3 className="text-2xl font-bold font-serif text-foreground tracking-tight">
```

---

### 5. PerformanceMode.tsx

**Context:** This component uses an intentionally dark theme for stage use. Changes should be minimal to maintain the high-contrast stage aesthetic while improving consistency where appropriate.

**Current Issues:**
- Timer display not using `font-mono tabular-nums`
- Song title in header could be larger and use serif
- Scroll speed multiplier could use tabular-nums for alignment

**Required Changes:**

**A. Song Title (Line 252)**
```diff
- <h1 className="text-xl font-bold text-white truncate max-w-[300px]">
+ <h1 className="text-xl font-bold font-serif text-white truncate max-w-[300px]">
```

**B. Timer Display (Lines 303-305)**
```diff
- <span className={`text-2xl font-mono font-bold ${isPlaying ? 'text-white' : 'text-zinc-500'}`}>
+ <span className={`text-2xl font-mono tabular-nums font-bold ${isPlaying ? 'text-white' : 'text-zinc-500'}`}>
```

**C. Scroll Speed Display (Line 282)**
```diff
- <span className="text-xs font-mono text-zinc-400 w-8">{scrollSpeed}x</span>
+ <span className="text-xs font-mono tabular-nums text-zinc-400 w-8">{scrollSpeed}x</span>
```

**D. Song Counter (Lines 249-250)**
```diff
- <span className="text-zinc-500 text-sm font-mono uppercase">
-   Song {currentIndex + 1}/{songs.length}
+ <span className="text-zinc-500 text-sm font-mono tabular-nums uppercase">
+   Song {currentIndex + 1}/{songs.length}
```

**E. Key Display (Line 358)**
Already styled appropriately - keep as is.

---

### 6. InvitationManager.tsx

**Current Issues:**
- Custom `getStatusBadgeStyle` function instead of design system Badge
- List items could use consistent hover/accent patterns
- Section titles could use serif

**Required Changes:**

**A. Status Badge Styling**
Replace custom function with consistent Badge variant usage or apply semantic colors directly:
```tsx
// Option 1: Use existing Badge with semantic colors
<Badge
  variant="outline"
  className={cn(
    'text-xs',
    status === 'pending' && 'bg-warning/10 text-warning border-warning/30',
    status === 'accepted' && 'bg-success/10 text-success border-success/30',
    status === 'cancelled' && 'bg-destructive/10 text-destructive border-destructive/30'
  )}
>
  {status}
</Badge>
```

**B. Section Headers** (if any)
Apply `font-serif` to any section titles.

**C. Invitation List Items**
Apply list item hover pattern:
```tsx
<div className="p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
```

---

## User Experience

### Before vs After

| Page            | Before                                      | After                                             |
| --------------- | ------------------------------------------- | ------------------------------------------------- |
| ScheduleManager | Static cards, basic typography              | Animated timeline, serif headlines, ambient glow  |
| BandDashboard   | Basic grid, no visual hierarchy             | Staggered member cards, accent borders, polish    |
| Settings        | Functional but plain                        | Consistent card styling, member list accents      |
| SongDetail      | Mostly styled, some inconsistencies         | Fully consistent typography and card patterns     |
| PerformanceMode | Custom dark theme                           | Minor improvements to number displays             |

### Animation Behavior

- Page entrance: Cards slide up with staggered delays (50-75ms between items)
- List items: Individual stagger based on index
- Hover states: 200ms transition for background color changes
- Respects `prefers-reduced-motion` media query (already configured in CSS)

---

## Testing Strategy

### Visual Regression Testing

1. **Manual Comparison:** Screenshot before/after for each component
2. **Cross-Browser:** Test in Chrome, Firefox, Safari on macOS/Windows
3. **Responsive:** Test at mobile (375px), tablet (768px), desktop (1440px) breakpoints

### Accessibility Testing

1. **Color Contrast:** Verify all text meets WCAG AA standards
2. **Touch Targets:** Confirm interactive elements are ≥44px on mobile
3. **Motion Sensitivity:** Test with `prefers-reduced-motion: reduce`
4. **Keyboard Navigation:** Verify all interactive elements are keyboard accessible

### Functional Testing

Since this is a styling-only change, verify:
1. All existing functionality continues to work
2. Animations don't interfere with user interactions
3. Form submissions, navigation, and data operations unchanged

### Test Cases

```tsx
// Example test for animation class application
describe('ScheduleManager', () => {
  it('applies entrance animation to timeline items', () => {
    render(<ScheduleManager events={mockEvents} />);
    const items = screen.getAllByRole('article'); // or appropriate role
    items.forEach((item, index) => {
      expect(item).toHaveClass('animate-slide-in-from-bottom');
      expect(item).toHaveStyle({ animationDelay: `${index * 75}ms` });
    });
  });
});
```

---

## Performance Considerations

### Animation Performance

- All animations use `transform` and `opacity` (GPU-accelerated properties)
- No layout thrashing from animated properties
- `will-change` not needed for these simple animations
- Stagger delays are minimal (50-75ms), total time to full visibility < 500ms

### Bundle Size

- No new dependencies
- Utility classes already exist in Tailwind bundle
- No significant size increase expected

### Runtime Performance

- `cn()` utility is optimized and memoization-safe
- Animation classes are static strings (no dynamic generation)
- No additional re-renders introduced

---

## Security Considerations

- No security implications - this is purely presentational
- No user input handling changes
- No new API calls or data fetching
- No changes to authentication or authorization

---

## Documentation Updates

1. **Update `docs/design-system.md`:**
   - Add implementation examples from newly styled components
   - Note that all page-level components now follow the design system
   - Add section on animation guidelines if not present

---

## Implementation Phases

### Phase 1: High-Impact Pages

1. **ScheduleManager.tsx** - Frequently accessed, high visibility
2. **BandDashboard.tsx** - Core navigation destination
3. **Settings.tsx** - Admin-focused but important

**Deliverables:**
- Serif headlines on all three
- Ambient glow backgrounds
- Entrance animations
- List item accent patterns
- Monospace number formatting

### Phase 2: Detail Pages

1. **SongDetail.tsx** - Already partially compliant, needs consistency pass
2. **InvitationManager.tsx** - Nested component, simpler changes

**Deliverables:**
- Consistent typography hierarchy
- Card pattern alignment
- Badge styling standardization

### Phase 3: Specialized Views

1. **PerformanceMode.tsx** - Minimal changes to preserve dark theme intent

**Deliverables:**
- Serif font for song titles
- Tabular-nums for all numeric displays

### Phase 4: Polish & Documentation

1. Final visual QA across all pages
2. Update design-system.md with new examples

---

## Open Questions (Resolved)

1. **Auth Pages:** Should Login/Signup/PasswordReset receive design system updates in this phase?
   - **Decision:** Defer to separate effort. These pages are functional and lower visibility.

2. **PerformanceMode Dark Theme:** The dark zinc-based theme is intentionally different for stage use. Should it receive more extensive updates?
   - **Decision:** Minimal changes only. The high-contrast dark theme serves a specific purpose.

3. **Animation Duration Consistency:** Should we standardize all animation durations (currently some are 200ms, 800ms, etc.)?
   - **Decision:** Document current values, standardize only if inconsistency causes issues.

---

## References

- [Design System Documentation](../docs/design-system.md)
- [Dashboard Implementation](../src/components/Dashboard.tsx) - Reference for patterns
- [Tailwind CSS Animation](https://tailwindcss.com/docs/animation)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Appendix: Current State Summary

| Component           | Serif Headlines | Ambient Glow | Entrance Animations | List Accents | Monospace Numbers |
| ------------------- | --------------- | ------------ | ------------------- | ------------ | ----------------- |
| Dashboard           | ✓               | ✓            | ✓                   | ✓            | ✓                 |
| PracticeRoom        | ✓               | ✓            | ✓                   | ✓            | ✓                 |
| SetlistManager      | ✓               | ✓            | ✓                   | ✓            | ✓                 |
| **ScheduleManager** | ✗               | ✗            | ✗                   | ✗            | Partial           |
| **BandDashboard**   | ✗               | ✗            | ✗                   | ✗            | ✗                 |
| **Settings**        | ✗               | N/A          | Partial             | ✗            | N/A               |
| **SongDetail**      | Partial         | N/A          | ✓                   | Partial      | ✓                 |
| **PerformanceMode** | ✗               | N/A          | N/A                 | N/A          | Partial           |
| **InvitationMgr**   | ✗               | N/A          | N/A                 | ✗            | N/A               |
