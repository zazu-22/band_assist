# Task Breakdown: Design System Phase 3 - Performance Mode

Generated: 2025-12-01
Source: specs/pending/feat-design-system-phase3-performance-mode.md

## Overview

Phase 3 applies minimal, targeted design system improvements to PerformanceMode.tsx. The component uses a dark zinc-based theme for stage use, so changes are limited to:

1. Typography consistency (serif font for song title)
2. Numeric display alignment (`tabular-nums` for all numeric displays)

**Explicit Non-Changes:**
- No ambient glow (intentionally dark for stage visibility)
- No entrance animations (performance-critical, instant rendering needed)
- No color scheme changes (high-contrast dark theme serves stage use)

---

## Phase 1: Typography Changes

### Task 1.1: Add `font-serif` to Song Title

**Description**: Apply serif font to the song title for design system consistency
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.2, 1.3, 1.4

**File**: `src/components/PerformanceMode.tsx`
**Location**: Line 252

**Current Code**:
```tsx
<h1 className="text-xl font-bold text-white truncate max-w-[300px]">
  {currentSong.title}
</h1>
```

**Target Code**:
```tsx
<h1 className="text-xl font-bold font-serif text-white truncate max-w-[300px]">
  {currentSong.title}
</h1>
```

**Implementation**:
Add `font-serif` class between `font-bold` and `text-white`

**Acceptance Criteria**:
- [ ] Song title uses `font-serif` class
- [ ] Text color and other styles unchanged
- [ ] Font displays correctly on stage (serif is legible at arm's length)

---

### Task 1.2: Add `tabular-nums` to Song Counter

**Description**: Add tabular-nums to the song counter for consistent number width
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.1, 1.3, 1.4

**File**: `src/components/PerformanceMode.tsx`
**Location**: Line 249

**Current Code**:
```tsx
<span className="text-zinc-500 text-sm font-mono uppercase">
  Song {currentIndex + 1}/{songs.length}
</span>
```

**Target Code**:
```tsx
<span className="text-zinc-500 text-sm font-mono tabular-nums uppercase">
  Song {currentIndex + 1}/{songs.length}
</span>
```

**Implementation**:
Add `tabular-nums` class between `font-mono` and `uppercase`

**Acceptance Criteria**:
- [ ] Song counter uses `font-mono tabular-nums` classes
- [ ] Numbers align properly when navigating between songs (1/5 → 10/15)
- [ ] No layout shift when song index changes

---

### Task 1.3: Add `tabular-nums` to Scroll Speed Display

**Description**: Add tabular-nums to scroll speed for consistent alignment
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.1, 1.2, 1.4

**File**: `src/components/PerformanceMode.tsx`
**Location**: Line 282

**Current Code**:
```tsx
<span className="text-xs font-mono text-zinc-400 w-8">{scrollSpeed}x</span>
```

**Target Code**:
```tsx
<span className="text-xs font-mono tabular-nums text-zinc-400 w-8">{scrollSpeed}x</span>
```

**Implementation**:
Add `tabular-nums` class between `font-mono` and `text-zinc-400`

**Acceptance Criteria**:
- [ ] Scroll speed display uses `font-mono tabular-nums` classes
- [ ] Multiplier aligns properly at different speeds (0.25x, 1.0x, 2.0x)
- [ ] No layout shift when adjusting scroll speed

---

### Task 1.4: Add `tabular-nums` to Timer Display

**Description**: Add tabular-nums to gig timer for consistent time display
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.1, 1.2, 1.3

**File**: `src/components/PerformanceMode.tsx`
**Location**: Lines 302-305

**Current Code**:
```tsx
<span
  className={`text-2xl font-mono font-bold ${isPlaying ? 'text-white' : 'text-zinc-500'}`}
>
  {formatTime(elapsedTime)}
</span>
```

**Target Code**:
```tsx
<span
  className={`text-2xl font-mono tabular-nums font-bold ${isPlaying ? 'text-white' : 'text-zinc-500'}`}
>
  {formatTime(elapsedTime)}
</span>
```

**Implementation**:
Add `tabular-nums` class between `font-mono` and `font-bold`

**Acceptance Criteria**:
- [ ] Timer display uses `font-mono tabular-nums` classes
- [ ] Digits don't flicker/shift as seconds change (0:00 → 9:59 → 59:59)
- [ ] No layout shift during playback

---

## Phase 2: Verification & Testing

### Task 2.1: Run TypeScript Type Checking

**Description**: Verify no TypeScript errors were introduced
**Size**: Small
**Priority**: High
**Dependencies**: Tasks 1.1, 1.2, 1.3, 1.4
**Can run parallel with**: Task 2.2

**Command**:
```bash
npm run typecheck
```

**Acceptance Criteria**:
- [ ] TypeScript compiles without errors
- [ ] No type regressions in PerformanceMode.tsx

---

### Task 2.2: Run ESLint

**Description**: Verify no linting warnings were introduced
**Size**: Small
**Priority**: High
**Dependencies**: Tasks 1.1, 1.2, 1.3, 1.4
**Can run parallel with**: Task 2.1

**Command**:
```bash
npm run lint
```

**Acceptance Criteria**:
- [ ] No new ESLint warnings or errors
- [ ] All existing suppressions still valid

---

### Task 2.3: Manual Visual Verification

**Description**: Verify changes look correct in the browser
**Size**: Medium
**Priority**: High
**Dependencies**: Tasks 2.1, 2.2

**Test Flow**:
1. Navigate to a setlist with multiple songs
2. Enter Performance Mode
3. Verify song title shows serif font
4. Verify song counter (e.g., "Song 1/5") has aligned numbers
5. Start timer and verify time display has aligned digits
6. Adjust scroll speed and verify the multiplier aligns properly
7. Navigate between songs to verify no layout shift
8. Exit Performance Mode

**Visual Checks**:
- [ ] **Song Title**: Serif font is visible and legible
- [ ] **Song Counter**: Numbers don't shift when navigating (1/5 → 10/15)
- [ ] **Timer**: Digits don't flicker when counting
- [ ] **Scroll Speed**: Multiplier stays aligned when adjusting

**Dark Theme Preservation**:
- [ ] Background remains `bg-zinc-950` / `bg-black`
- [ ] Text colors unchanged (`text-white`, `text-zinc-*`)
- [ ] Borders unchanged (`border-zinc-*`)
- [ ] Amber accents unchanged (`bg-amber-*`, `text-amber-*`)

**Functional Regression**:
- [ ] Navigation: Previous/Next song buttons work
- [ ] Timer: Play/Pause works correctly
- [ ] Auto-Scroll: Toggle and speed control work
- [ ] Metronome: Visual tick indicator works
- [ ] Chart Switching: Can switch between multiple charts
- [ ] Exit: Exit button returns to previous view

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                         PHASE 1                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │ Task    │ │ Task    │ │ Task    │ │ Task    │               │
│  │ 1.1     │ │ 1.2     │ │ 1.3     │ │ 1.4     │               │
│  │ (serif) │ │ (song#) │ │ (scroll)│ │ (timer) │               │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘               │
│       │           │           │           │                     │
│       └───────────┴───────────┴───────────┘                     │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         PHASE 2                                  │
│            ┌─────────────┴─────────────┐                        │
│            ▼                           ▼                        │
│      ┌─────────┐                 ┌─────────┐                    │
│      │ Task    │                 │ Task    │                    │
│      │ 2.1     │                 │ 2.2     │                    │
│      │ (tsc)   │                 │ (lint)  │                    │
│      └────┬────┘                 └────┬────┘                    │
│           │                           │                         │
│           └───────────┬───────────────┘                         │
│                       ▼                                         │
│                 ┌─────────┐                                     │
│                 │ Task    │                                     │
│                 │ 2.3     │                                     │
│                 │ (verify)│                                     │
│                 └─────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Parallel Execution Strategy

**Maximum parallelism**: 4 tasks simultaneously

| Time Slot | Tasks Running           |
|-----------|------------------------|
| T1        | 1.1, 1.2, 1.3, 1.4     |
| T2        | 2.1, 2.2               |
| T3        | 2.3                    |

**Total tasks**: 7
**Critical path**: Any Task 1.x → Task 2.1/2.2 → Task 2.3

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Line numbers shifted | Low | Low | Verified line numbers match actual file |
| `font-serif` not defined | Low | Medium | Tailwind CSS includes serif by default |
| `tabular-nums` not supported | Low | Low | Widely supported CSS feature |
| Dark theme accidentally changed | Low | High | All color classes preserved exactly |

---

## Rollback Plan

If issues are discovered post-merge:

1. Revert the PR (all changes are CSS-only)
2. Document the specific issue
3. Fix in a new branch before re-attempting

All changes add Tailwind utility classes only and do not affect functionality.

---

## Success Criteria

Phase 3 is complete when:

1. ✅ All four numeric displays use `tabular-nums`
2. ✅ Song title uses `font-serif`
3. ✅ No dark theme colors were changed
4. ✅ No TypeScript errors
5. ✅ No ESLint warnings introduced
6. ✅ All functional regression tests pass
7. ✅ Stage readability is maintained or improved
