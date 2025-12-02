# Design System Extension - Phase 1: High-Impact Pages

| Field       | Value                                       |
| ----------- | ------------------------------------------- |
| **Status**  | Ready                                       |
| **Authors** | Claude (AI Assistant)                       |
| **Created** | 2025-11-29                                  |
| **Updated** | 2025-11-29                                  |
| **Parent**  | `specs/feat-extend-design-system-app-wide.md` |

---

## Overview

Phase 1 applies the established design system to the three highest-impact non-compliant pages: ScheduleManager, BandDashboard, and Settings. These are frequently accessed pages where visual inconsistency is most noticeable.

---

## Scope

| Component             | Changes                                                    |
| --------------------- | ---------------------------------------------------------- |
| `ScheduleManager.tsx` | Serif headline, ambient glow, timeline animations, monospace numbers |
| `BandDashboard.tsx`   | Serif headline, ambient glow, card animations, left-border accents, monospace numbers |
| `Settings.tsx`        | Serif headline, tab animations, list item accents, card title styling |

---

## Pre-Implementation Verification

Before starting each component, verify:

1. **`cn()` utility is imported** - Check for `import { cn } from '@/lib/utils'`
2. **Parent container has `relative` class** - Required for ambient glow positioning
3. **Map functions provide `index`** - Required for staggered animations

---

## Implementation Details

### 1. ScheduleManager.tsx

**File:** `src/components/ScheduleManager.tsx`

#### A. Header Section (~Line 177)

```diff
- <h2 className="text-3xl font-bold text-foreground">Band Schedule</h2>
+ <h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">Band Schedule</h2>
```

#### B. Add Ambient Glow

Add after the opening `<div>` in the return statement. Ensure parent div has `relative` class.

```tsx
{/* Ambient background glow */}
<div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
  <div
    className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-[0.03]"
    style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }}
  />
</div>
```

#### C. Time Display (~Line 347)

```diff
- <div className="text-xs text-muted-foreground font-mono mt-1">
+ <div className="text-xs text-muted-foreground font-mono tabular-nums mt-1">
```

#### D. Date Display (~Line 341)

```diff
- <div className="text-2xl font-bold text-foreground leading-none">
+ <div className="text-2xl font-bold font-mono tabular-nums text-foreground leading-none">
```

#### E. Timeline Items Animation (~Line 297)

Update the map function to include index, then apply animation:

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

**Note:** Update the `.map()` call to include index: `.map((item, index) => ...)`

#### F. Form Card Title (~Line 188)

```diff
- <CardTitle>{editingId ? 'Edit Event' : 'New Event'}</CardTitle>
+ <CardTitle className="font-serif">{editingId ? 'Edit Event' : 'New Event'}</CardTitle>
```

---

### 2. BandDashboard.tsx

**File:** `src/components/BandDashboard.tsx`

#### A. Header Section (~Line 81)

```diff
- <h2 className="text-3xl font-bold text-foreground">Band Lineup</h2>
+ <h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">Band Lineup</h2>
```

#### B. Add Ambient Glow

Add after opening `<div>` in return. Add `relative` class to parent if not present.

```tsx
{/* Ambient background glow */}
<div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
  <div
    className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-[0.03]"
    style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }}
  />
</div>
```

#### C. Member Card Grid (~Line 99)

```diff
- <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
+ <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
```

#### D. Individual Card Animation (~Lines 105-127)

Update map to include index, then apply animation and left-border accent:

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

#### E. Role Count Monospace (~Line 141)

```diff
- <p className="text-xs text-muted-foreground mt-1">
-   {roleCount} Active Role{roleCount !== 1 ? 's' : ''}
- </p>
+ <p className="text-xs text-muted-foreground mt-1">
+   <span className="font-mono tabular-nums">{roleCount}</span> Active Role{roleCount !== 1 ? 's' : ''}
+ </p>
```

#### F. Detail View Card Title (~Line 164)

```diff
- <CardTitle className="text-xl">{selectedMember.name}&apos;s Gig Sheet</CardTitle>
+ <CardTitle className="text-xl font-serif">{selectedMember.name}&apos;s Gig Sheet</CardTitle>
```

#### G. Song Card BPM (~Line 205)

```diff
- {song.key} • {song.bpm} BPM
+ {song.key} • <span className="font-mono tabular-nums">{song.bpm}</span> BPM
```

---

### 3. Settings.tsx

**File:** `src/components/Settings.tsx`

#### A. Header Section (~Line 226)

```diff
- <h2 className="text-3xl font-bold text-foreground">Configuration</h2>
+ <h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">Configuration</h2>
```

#### B. Tab Content Animation (~Lines 253, 357, 401, 415)

Apply to all TabsContent components:

```diff
- <TabsContent value="ROSTER" className="space-y-6 animate-fade-in">
+ <TabsContent value="ROSTER" className="space-y-6 animate-slide-in-from-bottom animation-forwards">
```

#### C. Card Titles (~Lines 256, 360, 418)

```diff
- <CardTitle>Members</CardTitle>
+ <CardTitle className="font-serif">Members</CardTitle>
```

#### D. Member List Item Pattern (~Lines 265-268)

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

#### E. Export/Import Card Titles (~Lines 434, 455)

```diff
- <h4 className="font-bold text-foreground">Export Project</h4>
+ <h4 className="font-bold font-serif text-foreground">Export Project</h4>
```

```diff
- <h4 className="font-bold text-foreground">Import Project</h4>
+ <h4 className="font-bold font-serif text-foreground">Import Project</h4>
```

#### F. Warning Card Title (~Line 484)

```diff
- <h4 className="font-bold text-destructive">Local Storage Warning</h4>
+ <h4 className="font-bold font-serif text-destructive">Local Storage Warning</h4>
```

---

## Verification Checklist

### Per-Component Verification

For each component, verify after implementation:

- [ ] **Typography:** Page headline uses `text-4xl font-bold font-serif tracking-tight`
- [ ] **Ambient Glow:** Background glow visible (subtle, ~3% opacity)
- [ ] **Animations:** Elements animate in on page load with stagger
- [ ] **Monospace Numbers:** All numeric displays use `font-mono tabular-nums`
- [ ] **Left-Border Accents:** List items have `border-l-[3px] border-l-primary/60`
- [ ] **Hover States:** Items have `hover:bg-muted/30 transition-colors`

### Cross-Browser Testing

Test in:
- [ ] Chrome (macOS)
- [ ] Firefox (macOS)
- [ ] Safari (macOS)

### Responsive Testing

Test at breakpoints:
- [ ] Mobile: 375px
- [ ] Tablet: 768px
- [ ] Desktop: 1440px

### Accessibility Testing

- [ ] **Reduced Motion:** Enable `prefers-reduced-motion: reduce` in OS settings, verify animations are disabled
- [ ] **Color Contrast:** Verify text remains readable with new styling
- [ ] **Touch Targets:** Verify interactive elements are ≥44px on mobile

### Functional Regression

- [ ] **ScheduleManager:** Create, edit, delete events still works
- [ ] **BandDashboard:** Member selection and detail view works
- [ ] **Settings:** All tabs render, member management works, export/import works

---

## Test Commands

```bash
# Run type checking
npm run typecheck

# Run linting
npm run lint

# Run tests (if applicable)
npm test

# Start dev server for manual testing
npm run dev
```

---

## Success Criteria

Phase 1 is complete when:

1. All three components pass the verification checklist
2. No TypeScript errors
3. No ESLint warnings introduced
4. All functional regression tests pass
5. Visual comparison shows consistent "Backstage Command Center" aesthetic matching Dashboard/PracticeRoom/SetlistManager

---

## Rollback Plan

If issues are discovered post-merge:

1. Revert the PR
2. Document the specific issue
3. Fix in a new branch before re-attempting

All changes are CSS-only and should not affect functionality. If functionality breaks, it indicates an unintended code change that should be investigated.
