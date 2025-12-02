# Design System Extension - Phase 4: Polish & Final QA

| Field       | Value                                       |
| ----------- | ------------------------------------------- |
| **Status**  | Ready                                       |
| **Authors** | Claude (AI Assistant)                       |
| **Created** | 2025-11-29                                  |
| **Updated** | 2025-11-29                                  |
| **Parent**  | `specs/feat-extend-design-system-app-wide.md` |
| **Depends** | Phases 1, 2, 3 (all must be complete)       |

---

## Overview

Phase 4 is the final quality assurance pass across all updated components. This phase focuses on visual consistency verification, cross-page navigation testing, and documentation updates. No new component changes are expected unless issues are discovered during QA.

---

## Scope

| Activity                    | Description                                        |
| --------------------------- | -------------------------------------------------- |
| Visual QA                   | Side-by-side comparison of all pages               |
| Navigation Flow Testing     | Test transitions between pages                     |
| Animation Consistency Audit | Verify animation timing and behavior               |
| Documentation Update        | Update `docs/design-system.md` with new examples   |

---

## Visual QA Checklist

### Typography Consistency

Compare all pages side-by-side. Each page headline should use identical styling:

| Page            | Expected Headline Class                                      | Status |
| --------------- | ------------------------------------------------------------ | ------ |
| Dashboard       | `text-4xl font-bold font-serif text-foreground tracking-tight` | [ ]    |
| PracticeRoom    | `text-4xl font-bold font-serif text-foreground tracking-tight` | [ ]    |
| SetlistManager  | `text-4xl font-bold font-serif text-foreground tracking-tight` | [ ]    |
| ScheduleManager | `text-4xl font-bold font-serif text-foreground tracking-tight` | [ ]    |
| BandDashboard   | `text-4xl font-bold font-serif text-foreground tracking-tight` | [ ]    |
| Settings        | `text-4xl font-bold font-serif text-foreground tracking-tight` | [ ]    |
| SongDetail      | `text-3xl font-bold font-serif text-foreground tracking-tight` | [ ]    |

### Ambient Glow Consistency

| Page            | Has Ambient Glow | Position      | Status |
| --------------- | ---------------- | ------------- | ------ |
| Dashboard       | Yes              | Top-left      | [ ]    |
| PracticeRoom    | Yes              | Top-left      | [ ]    |
| SetlistManager  | Yes              | Top-right     | [ ]    |
| ScheduleManager | Yes              | Top-right     | [ ]    |
| BandDashboard   | Yes              | Top-left      | [ ]    |
| Settings        | No               | N/A           | [ ]    |
| SongDetail      | No               | N/A           | [ ]    |
| PerformanceMode | No               | N/A (dark UI) | [ ]    |

### Animation Behavior

| Page            | Entrance Animation              | Stagger Delay | Status |
| --------------- | ------------------------------- | ------------- | ------ |
| Dashboard       | slide-in-from-bottom            | 75ms          | [ ]    |
| PracticeRoom    | slide-in-from-left              | Varies        | [ ]    |
| SetlistManager  | slide-in-from-bottom            | 75ms          | [ ]    |
| ScheduleManager | slide-in-from-bottom            | 75ms          | [ ]    |
| BandDashboard   | slide-in-from-bottom            | 75ms          | [ ]    |
| Settings        | slide-in-from-bottom (per tab)  | N/A           | [ ]    |
| SongDetail      | Existing animations             | N/A           | [ ]    |
| PerformanceMode | None (instant render)           | N/A           | [ ]    |

### List Item Accent Pattern

| Page            | Uses Left-Border Accent | Status |
| --------------- | ----------------------- | ------ |
| Dashboard       | Yes                     | [ ]    |
| PracticeRoom    | Yes                     | [ ]    |
| SetlistManager  | Yes                     | [ ]    |
| ScheduleManager | No (timeline style)     | [ ]    |
| BandDashboard   | Yes (selected state)    | [ ]    |
| Settings        | Yes                     | [ ]    |
| SongDetail      | Yes                     | [ ]    |

### Monospace Numbers

| Page            | Numeric Elements             | Uses tabular-nums | Status |
| --------------- | ---------------------------- | ----------------- | ------ |
| Dashboard       | Countdown, stats             | Yes               | [ ]    |
| PracticeRoom    | BPM                          | Yes               | [ ]    |
| SetlistManager  | Duration, counts             | Yes               | [ ]    |
| ScheduleManager | Dates, times                 | Yes               | [ ]    |
| BandDashboard   | Role count, BPM              | Yes               | [ ]    |
| Settings        | N/A                          | N/A               | [ ]    |
| SongDetail      | BPM, timing                  | Yes               | [ ]    |
| PerformanceMode | Timer, counter, scroll speed | Yes               | [ ]    |

---

## Navigation Flow Testing

Test these user journeys to ensure smooth transitions:

### Journey 1: Song Management Flow
1. [ ] Dashboard → Click song → SongDetail
2. [ ] SongDetail → Back to Dashboard
3. [ ] Dashboard → Practice Room → Select song
4. [ ] Practice Room → Back to Dashboard

### Journey 2: Setlist Flow
1. [ ] Dashboard → Setlist Manager
2. [ ] Setlist Manager → Create setlist → Add songs
3. [ ] Setlist Manager → Performance Mode
4. [ ] Performance Mode → Exit → Setlist Manager

### Journey 3: Band Management Flow
1. [ ] Dashboard → Band Dashboard
2. [ ] Band Dashboard → Select member → View details
3. [ ] Band Dashboard → Settings
4. [ ] Settings → Schedule Manager
5. [ ] Schedule Manager → Dashboard

### Journey 4: Settings Flow
1. [ ] Any page → Settings
2. [ ] Settings → Roster tab → Manage members
3. [ ] Settings → Invitations (via InvitationManager)
4. [ ] Settings → Export/Import functionality

---

## Animation Consistency Audit

### Reduced Motion Testing

1. Enable reduced motion in OS:
   - macOS: System Preferences → Accessibility → Display → Reduce motion
   - Windows: Settings → Ease of Access → Display → Show animations
   - CSS: `@media (prefers-reduced-motion: reduce)`

2. Verify all pages:
   - [ ] Animations are disabled or reduced
   - [ ] No jarring motion
   - [ ] Content still appears correctly

### Animation Timing Review

| Animation Class               | Duration | Easing        | Status |
| ----------------------------- | -------- | ------------- | ------ |
| animate-slide-in-from-bottom  | 500ms    | ease-out      | [ ]    |
| animate-slide-in-from-left    | 500ms    | ease-out      | [ ]    |
| animate-fade-in               | 200ms    | ease-in-out   | [ ]    |
| transition-colors             | 200ms    | default       | [ ]    |

---

## Documentation Update

### Update `docs/design-system.md`

Add/update the following sections:

#### 1. Component Coverage Table

Add to documentation:

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

#### 2. Animation Guidelines Section

Add if not present:

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

#### 3. Numeric Display Pattern

Add if not present:

```markdown
## Numeric Displays

All numeric values should use `font-mono tabular-nums` for:
- Consistent digit width
- Prevention of layout shift
- Professional appearance

Example:
\`\`\`tsx
<span className="font-mono tabular-nums">{count}</span>
\`\`\`
```

---

## Final Verification

### Build Verification

```bash
# Full build with no errors
npm run build

# Type checking passes
npm run typecheck

# Linting passes
npm run lint
```

### Performance Check

- [ ] No new bundle size warnings
- [ ] Animations run at 60fps
- [ ] No layout shift during animations

### Accessibility Final Check

- [ ] All pages pass automated a11y audit
- [ ] Keyboard navigation works on all pages
- [ ] Screen reader announces content correctly

---

## Success Criteria

Phase 4 is complete when:

1. All visual QA checklists pass
2. All navigation journeys work smoothly
3. Animation consistency is verified
4. Documentation is updated
5. Build passes with no errors
6. No regressions from Phases 1-3

---

## Sign-Off

| Reviewer        | Date | Status   |
| --------------- | ---- | -------- |
| Developer       |      | Pending  |
| Visual QA       |      | Pending  |
| Documentation   |      | Pending  |

---

## Post-Completion

After Phase 4 is merged:

1. Archive the parent spec (`feat-extend-design-system-app-wide.md`)
2. Archive phase specs (1-4)
3. Consider future work:
   - Auth pages (Login, Signup, PasswordReset) - lower priority
   - Any new components should follow the design system from inception
