# Task Breakdown: Design System Phase 4 - Polish & Final QA

Generated: 2025-12-02
Source: specs/pending/feat-design-system-phase4-polish-qa.md

## Overview

Phase 4 is the final quality assurance pass across all updated components. This phase focuses on visual consistency verification, cross-page navigation testing, animation consistency auditing, and documentation updates. The goal is to ensure all components from Phases 1-3 are consistent and the design system documentation is complete.

---

## Current State Analysis

After reviewing all components, here's the current compliance status:

### Components Already Compliant

| Component       | Serif Headlines | Ambient Glow | Animations | List Accents | Monospace Numbers |
| --------------- | --------------- | ------------ | ---------- | ------------ | ----------------- |
| Dashboard       | ✓               | ✓ (top-left) | ✓          | ✓            | ✓                 |
| PracticeRoom    | Partial         | ✓ (top-left) | ✓          | ✓            | ✓                 |
| SetlistManager  | ✓               | ✓ (top-right)| ✓          | ✓            | ✓                 |
| ScheduleManager | ✓               | ✓ (top-right)| ✓          | Timeline     | ✓                 |
| BandDashboard   | ✓               | ✓ (top-left) | ✓          | ✓            | ✓                 |
| Settings        | ✓               | None         | ✓          | ✓            | N/A               |
| SongDetail      | ✓ (text-3xl)    | None         | ✓          | ✓            | ✓                 |
| PerformanceMode | ✓               | None         | None       | N/A          | ✓                 |

---

## Phase 1: Visual QA Verification

### Task 1.1: Typography Consistency Audit

**Description**: Verify all page headlines use identical styling per design system
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.2, 1.3

**Technical Requirements**:
Each main page headline should use:
```tsx
className="text-4xl font-bold font-serif text-foreground tracking-tight"
```

Exception: SongDetail uses `text-3xl` due to layout constraints.

**Files to Verify**:
- `src/components/Dashboard.tsx:317` - ✓ Correct
- `src/components/PracticeRoom.tsx` - Needs verification (no visible headline, uses control bar)
- `src/components/SetlistManager.tsx` - Uses `SetlistHeader` component
- `src/components/ScheduleManager.tsx:197` - ✓ Correct
- `src/components/BandDashboard.tsx:90` - ✓ Correct
- `src/components/Settings.tsx:254` - ✓ Correct
- `src/components/SongDetail.tsx:401` - ✓ Uses text-3xl as expected
- `src/components/PerformanceMode.tsx:252` - ✓ Uses font-serif

**Acceptance Criteria**:
- [ ] All main page headlines verified against design system
- [ ] SetlistHeader component verified for correct typography
- [ ] PracticeRoom header approach documented (uses control bar pattern)
- [ ] No typography inconsistencies found or fixed

---

### Task 1.2: Ambient Glow Consistency Audit

**Description**: Verify ambient glow placement matches design system specification
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.1, 1.3

**Technical Requirements**:
The ambient glow should use this pattern:
```tsx
<div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
  <div
    className="absolute -top-1/4 -{position}-1/4 w-1/2 h-1/2 rounded-full opacity-[0.03]"
    style={{
      background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
    }}
  />
</div>
```

**Expected Positions**:
| Page            | Position   | Status |
| --------------- | ---------- | ------ |
| Dashboard       | -left-1/4  | ✓      |
| PracticeRoom    | N/A (none) | Design decision needed |
| SetlistManager  | -left-1/4  | Verify via SetlistHeader |
| ScheduleManager | -right-1/4 | ✓      |
| BandDashboard   | -left-1/4  | ✓      |
| Settings        | None       | ✓ Expected |
| SongDetail      | None       | ✓ Expected |
| PerformanceMode | None       | ✓ Expected (dark UI) |

**Acceptance Criteria**:
- [ ] All pages with ambient glow verified
- [ ] Glow positions match design system spec
- [ ] Pages without glow confirmed as intentional

---

### Task 1.3: Monospace Numbers Audit

**Description**: Verify all numeric displays use font-mono tabular-nums
**Size**: Medium
**Priority**: Medium
**Dependencies**: None
**Can run parallel with**: Task 1.1, 1.2

**Technical Requirements**:
All numeric values should use:
```tsx
className="font-mono tabular-nums"
```

**Files to Verify**:
- Dashboard: Countdown (line 333), stats (line 380-384)
- PracticeRoom: BPM display (line 106)
- SetlistManager: Duration, counts (verify via SetlistStats)
- ScheduleManager: Dates (line 372-382)
- BandDashboard: Role count (line 150), BPM (line 214)
- Settings: N/A
- SongDetail: BPM (line 545), timing (line 555, 568)
- PerformanceMode: Timer (line 249, 303), scroll speed (line 283), BPM (line 294)

**Acceptance Criteria**:
- [ ] All numeric displays verified
- [ ] No layout shift observed during number changes
- [ ] Consistent numeric styling across all pages

---

### Task 1.4: List Item Accent Pattern Audit

**Description**: Verify left-border accent pattern consistency
**Size**: Small
**Priority**: Medium
**Dependencies**: None
**Can run parallel with**: Task 1.1, 1.2, 1.3

**Technical Requirements**:
List items should use:
```tsx
className="border-l-[3px] border-l-primary/60"
```

For selected states:
```tsx
className={cn(
  'border-l-[3px]',
  isSelected ? 'border-l-primary' : 'border-l-primary/60'
)}
```

**Files to Verify**:
- Dashboard (Practice Queue): line 644 - ✓
- PracticeRoom (Song List): line 93 - ✓
- SetlistManager: Via SetlistItem component
- ScheduleManager: Uses timeline pattern (different)
- BandDashboard: line 121 (selected state) - ✓
- Settings (Members): line 297 - ✓
- SongDetail (Assignments): line 874 - ✓

**Acceptance Criteria**:
- [ ] All list items use consistent accent pattern
- [ ] Selected states properly distinguished
- [ ] ScheduleManager timeline style documented as intentional variation

---

## Phase 2: Animation Consistency

### Task 2.1: Entrance Animation Audit

**Description**: Verify entrance animations use consistent patterns
**Size**: Medium
**Priority**: Medium
**Dependencies**: Phase 1 tasks
**Can run parallel with**: Task 2.2

**Technical Requirements**:
Standard entrance animation:
```tsx
className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-{n}"
```

For dynamic lists:
```tsx
style={{ animationDelay: `${index * 75}ms` }}
```

**Pages to Verify**:
| Page            | Animation Type                | Stagger |
| --------------- | ----------------------------- | ------- |
| Dashboard       | slide-in-from-bottom          | stagger classes |
| PracticeRoom    | slide-in-from-left            | Per component |
| SetlistManager  | slide-in-from-bottom          | stagger classes |
| ScheduleManager | slide-in-from-bottom          | 75ms inline |
| BandDashboard   | slide-in-from-bottom          | 75ms inline |
| Settings        | slide-in-from-bottom (per tab)| N/A |
| SongDetail      | slide-in-from-bottom          | stagger classes |
| PerformanceMode | None (instant render)         | N/A |

**Acceptance Criteria**:
- [ ] All entrance animations verified
- [ ] Consistent 75ms stagger delay used
- [ ] PerformanceMode confirmed to have no entrance animations (intentional)

---

### Task 2.2: Reduced Motion Testing

**Description**: Test all animations with reduced motion preference
**Size**: Medium
**Priority**: High
**Dependencies**: Task 2.1
**Can run parallel with**: Task 2.3

**Technical Requirements**:
1. Enable reduced motion in OS:
   - macOS: System Preferences → Accessibility → Display → Reduce motion
   - CSS: `@media (prefers-reduced-motion: reduce)`

2. Verify `index.css` has reduced motion support:
```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Acceptance Criteria**:
- [ ] Reduced motion CSS rule exists in index.css
- [ ] All pages render correctly with reduced motion
- [ ] No jarring motion or layout shifts
- [ ] Content appears without delay

---

### Task 2.3: Animation Timing Audit

**Description**: Verify animation timing matches design system
**Size**: Small
**Priority**: Low
**Dependencies**: Task 2.1
**Can run parallel with**: Task 2.2

**Technical Requirements**:
| Animation Class               | Duration | Easing      |
| ----------------------------- | -------- | ----------- |
| animate-slide-in-from-bottom  | 500ms    | ease-out    |
| animate-slide-in-from-left    | 500ms    | ease-out    |
| animate-fade-in               | 200ms    | ease-in-out |
| transition-colors             | 200ms    | default     |

**File to Check**: `src/index.css` or Tailwind config

**Acceptance Criteria**:
- [ ] Animation durations verified in CSS
- [ ] Easing functions correct
- [ ] All custom animations documented

---

## Phase 3: Navigation Flow Testing

### Task 3.1: Song Management Flow

**Description**: Test navigation between song-related pages
**Size**: Medium
**Priority**: High
**Dependencies**: Phase 2 tasks
**Can run parallel with**: Task 3.2, 3.3, 3.4

**Test Steps**:
1. Dashboard → Click song → SongDetail
2. SongDetail → Back to Dashboard
3. Dashboard → Practice Room → Select song
4. Practice Room → Back to Dashboard

**Acceptance Criteria**:
- [ ] All navigation paths work correctly
- [ ] No state loss during navigation
- [ ] Back navigation works as expected
- [ ] No console errors during transitions

---

### Task 3.2: Setlist Flow

**Description**: Test setlist and performance mode navigation
**Size**: Medium
**Priority**: High
**Dependencies**: Phase 2 tasks
**Can run parallel with**: Task 3.1, 3.3, 3.4

**Test Steps**:
1. Dashboard → Setlist Manager
2. Setlist Manager → Create setlist → Add songs
3. Setlist Manager → Performance Mode
4. Performance Mode → Exit → Setlist Manager

**Acceptance Criteria**:
- [ ] Setlist creation works
- [ ] Performance mode entry/exit works
- [ ] Song order preserved
- [ ] No state corruption

---

### Task 3.3: Band Management Flow

**Description**: Test band and settings navigation
**Size**: Medium
**Priority**: Medium
**Dependencies**: Phase 2 tasks
**Can run parallel with**: Task 3.1, 3.2, 3.4

**Test Steps**:
1. Dashboard → Band Dashboard
2. Band Dashboard → Select member → View details
3. Band Dashboard → Settings
4. Settings → Schedule Manager
5. Schedule Manager → Dashboard

**Acceptance Criteria**:
- [ ] All navigation paths work
- [ ] Member selection displays correct data
- [ ] Cross-page navigation maintains state

---

### Task 3.4: Settings Flow

**Description**: Test settings tabs and features
**Size**: Small
**Priority**: Medium
**Dependencies**: Phase 2 tasks
**Can run parallel with**: Task 3.1, 3.2, 3.3

**Test Steps**:
1. Any page → Settings
2. Settings → Roster tab → Manage members
3. Settings → Invitations (via InvitationManager)
4. Settings → Export/Import functionality

**Acceptance Criteria**:
- [ ] All settings tabs accessible
- [ ] Tab animations work correctly
- [ ] Export/Import functions work
- [ ] Data persists after operations

---

## Phase 4: Documentation Update

### Task 4.1: Update Design System Documentation

**Description**: Update docs/design-system.md with Phase 4 findings
**Size**: Medium
**Priority**: High
**Dependencies**: Tasks 1.1-3.4
**Can run parallel with**: Task 4.2

**Changes Required**:

1. **Add Component Compliance Table**:
```markdown
## Component Compliance

| Component         | Serif Headlines | Ambient Glow | Animations | List Accents | Monospace Numbers |
| ----------------- | --------------- | ------------ | ---------- | ------------ | ----------------- |
| Dashboard         | ✓               | ✓            | ✓          | ✓            | ✓                 |
| PracticeRoom      | ✓               | ✓            | ✓          | ✓            | ✓                 |
| SetlistManager    | ✓               | ✓            | ✓          | ✓            | ✓                 |
| ScheduleManager   | ✓               | ✓            | ✓          | Timeline     | ✓                 |
| BandDashboard     | ✓               | ✓            | ✓          | ✓            | ✓                 |
| Settings          | ✓               | N/A          | ✓          | ✓            | N/A               |
| SongDetail        | ✓               | N/A          | ✓          | ✓            | ✓                 |
| PerformanceMode   | ✓               | N/A          | N/A        | N/A          | ✓                 |
| InvitationManager | N/A             | N/A          | N/A        | ✓            | N/A               |
```

2. **Add Animation Guidelines** (if not present):
```markdown
## Animation Guidelines

### Entrance Animations
- Use `animate-slide-in-from-bottom` for cards and list items
- Apply staggered delays: `style={{ animationDelay: \`${index * 75}ms\` }}`
- Always include `animation-forwards opacity-0` for proper initial state

### Hover States
- Use `hover:bg-muted/30 transition-colors` for list items
- Transition duration: 200ms (default)

### Reduced Motion
All animations respect `prefers-reduced-motion` media query.
```

3. **Add Numeric Display Pattern** (if not present):
```markdown
## Numeric Displays

All numeric values should use `font-mono tabular-nums` for:
- Consistent digit width
- Prevention of layout shift
- Professional appearance

Example:
```tsx
<span className="font-mono tabular-nums">{count}</span>
```
```

**Acceptance Criteria**:
- [ ] Component compliance table added
- [ ] Animation guidelines section complete
- [ ] Numeric display pattern documented
- [ ] Documentation last updated date changed

---

### Task 4.2: Update Documentation Date

**Description**: Update the last updated date in design-system.md
**Size**: Small
**Priority**: Low
**Dependencies**: Task 4.1

**Change Required**:
```markdown
_Last updated: December 2024 (Phase 4 updates)_
```

**Acceptance Criteria**:
- [ ] Date updated to reflect Phase 4 completion

---

## Phase 5: Final Verification

### Task 5.1: Build Verification

**Description**: Run full build with no errors
**Size**: Small
**Priority**: Critical
**Dependencies**: All previous tasks

**Commands**:
```bash
npm run build
npm run typecheck
npm run lint
```

**Acceptance Criteria**:
- [ ] `npm run build` passes with no errors
- [ ] `npm run typecheck` passes with no type errors
- [ ] `npm run lint` passes with no linting errors
- [ ] No new bundle size warnings

---

### Task 5.2: Performance Check

**Description**: Verify animations run smoothly
**Size**: Small
**Priority**: High
**Dependencies**: Task 5.1

**Tests**:
- [ ] Animations run at 60fps
- [ ] No layout shift during animations
- [ ] Page transitions smooth

**Acceptance Criteria**:
- [ ] Chrome DevTools Performance tab shows no major issues
- [ ] No visible jank or stuttering
- [ ] Layout Shift score acceptable

---

### Task 5.3: Accessibility Final Check

**Description**: Verify accessibility compliance
**Size**: Medium
**Priority**: High
**Dependencies**: Task 5.1

**Tests**:
- [ ] Run automated a11y audit (Lighthouse or axe)
- [ ] Test keyboard navigation on all pages
- [ ] Test with screen reader (VoiceOver/NVDA)

**Acceptance Criteria**:
- [ ] No critical accessibility issues
- [ ] All interactive elements keyboard accessible
- [ ] Screen reader announces content correctly
- [ ] Focus indicators visible

---

## Summary

| Phase | Tasks | Priority | Estimated Effort |
| ----- | ----- | -------- | ---------------- |
| 1. Visual QA | 4 tasks | High | ~2 hours |
| 2. Animation | 3 tasks | Medium | ~1 hour |
| 3. Navigation | 4 tasks | High | ~1 hour |
| 4. Documentation | 2 tasks | High | ~1 hour |
| 5. Final Verification | 3 tasks | Critical | ~1 hour |

**Total Tasks**: 16
**Parallel Opportunities**: Tasks within each phase can run in parallel
**Critical Path**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

---

## Execution Strategy

1. **Start with Visual QA** (Phase 1): Run all 4 tasks in parallel since they're independent code reviews
2. **Animation Testing** (Phase 2): Can begin once Phase 1 identifies any issues
3. **Navigation Testing** (Phase 3): All 4 flows can be tested in parallel
4. **Documentation** (Phase 4): Update based on findings from Phases 1-3
5. **Final Verification** (Phase 5): Sequential - build must pass before other checks

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| Typography inconsistencies found | Low | Low | Quick fix - just CSS class changes |
| Animation issues with reduced motion | Medium | Medium | Check index.css for media query |
| Navigation state bugs | Low | High | Test thoroughly before shipping |
| Build failures | Low | Critical | Run build early and often |
| Accessibility regressions | Low | High | Run axe before final merge |

---

## Sign-Off Checklist

- [ ] All Phase 1 tasks complete
- [ ] All Phase 2 tasks complete
- [ ] All Phase 3 tasks complete
- [ ] All Phase 4 tasks complete
- [ ] All Phase 5 tasks complete
- [ ] No regressions from Phases 1-3
- [ ] Documentation updated
- [ ] PR ready for review
