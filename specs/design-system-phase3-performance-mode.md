# Design System Extension - Phase 3: Performance Mode

| Field       | Value                                       |
| ----------- | ------------------------------------------- |
| **Status**  | Ready                                       |
| **Authors** | Claude (AI Assistant)                       |
| **Created** | 2025-11-29                                  |
| **Updated** | 2025-11-29                                  |
| **Parent**  | `specs/feat-extend-design-system-app-wide.md` |
| **Depends** | None (independent of other phases)          |

---

## Overview

Phase 3 applies minimal, targeted design system improvements to PerformanceMode. This component intentionally uses a dark zinc-based theme for stage use, so changes are limited to typography consistency and numeric display alignment only.

---

## Scope

| Component            | Changes                                      |
| -------------------- | -------------------------------------------- |
| `PerformanceMode.tsx`| Serif song title, tabular-nums on all numeric displays |

**Explicit Non-Changes:**
- No ambient glow (intentionally dark for stage visibility)
- No entrance animations (performance-critical, instant rendering needed)
- No color scheme changes (high-contrast dark theme serves stage use)

---

## Pre-Implementation Verification

Before starting, verify:

1. **Current line numbers** - This is a ~400 line component; verify locations before editing
2. **Dark theme preserved** - All zinc-based colors must remain unchanged

---

## Implementation Details

### PerformanceMode.tsx

**File:** `src/components/PerformanceMode.tsx`

#### A. Song Title (~Line 252)

Add serif font for consistency:

```diff
- <h1 className="text-xl font-bold text-white truncate max-w-[300px]">
+ <h1 className="text-xl font-bold font-serif text-white truncate max-w-[300px]">
```

#### B. Song Counter (~Lines 249-250)

Add tabular-nums for consistent number width:

```diff
- <span className="text-zinc-500 text-sm font-mono uppercase">
-   Song {currentIndex + 1}/{songs.length}
+ <span className="text-zinc-500 text-sm font-mono tabular-nums uppercase">
+   Song {currentIndex + 1}/{songs.length}
```

#### C. Scroll Speed Display (~Line 282)

Add tabular-nums for alignment:

```diff
- <span className="text-xs font-mono text-zinc-400 w-8">{scrollSpeed}x</span>
+ <span className="text-xs font-mono tabular-nums text-zinc-400 w-8">{scrollSpeed}x</span>
```

#### D. Timer Display (~Lines 303-305)

Add tabular-nums for consistent time display:

```diff
- <span className={`text-2xl font-mono font-bold ${isPlaying ? 'text-white' : 'text-zinc-500'}`}>
+ <span className={`text-2xl font-mono tabular-nums font-bold ${isPlaying ? 'text-white' : 'text-zinc-500'}`}>
```

---

## Verification Checklist

### Typography Verification

- [ ] **Song Title:** Uses `font-serif` class
- [ ] **Song Counter:** Uses `font-mono tabular-nums`
- [ ] **Scroll Speed:** Uses `font-mono tabular-nums`
- [ ] **Timer Display:** Uses `font-mono tabular-nums`

### Dark Theme Preservation

- [ ] **Background:** Remains `bg-zinc-950` / `bg-black`
- [ ] **Text Colors:** All `text-white`, `text-zinc-*` classes unchanged
- [ ] **Borders:** All `border-zinc-*` classes unchanged
- [ ] **Accent Colors:** Amber accents (`bg-amber-*`, `text-amber-*`) unchanged

### Number Alignment Verification

Test with various data to ensure numbers align properly:

- [ ] **Song Counter:** Test with songs 1/9, 10/99, 100/999
- [ ] **Timer:** Test display at 0:00, 9:59, 59:59, 1:00:00
- [ ] **Scroll Speed:** Test at 0.25x, 1.0x, 2.0x

### Functional Regression

- [ ] **Navigation:** Previous/Next song buttons work
- [ ] **Timer:** Play/Pause works correctly
- [ ] **Auto-Scroll:** Toggle and speed control work
- [ ] **Metronome:** Visual tick indicator works
- [ ] **Chart Switching:** Can switch between multiple charts
- [ ] **Exit:** Exit button returns to previous view

### Stage Readability

- [ ] **High Contrast:** Text remains easily readable on dark background
- [ ] **Glare Resistance:** No bright elements that would cause issues on stage
- [ ] **Font Legibility:** Serif title and mono numbers are clear at arm's length

---

## Test Commands

```bash
# Run type checking
npm run typecheck

# Run linting
npm run lint

# Start dev server for manual testing
npm run dev
```

### Manual Test Flow

1. Navigate to a setlist with multiple songs
2. Enter Performance Mode
3. Verify song title shows serif font
4. Verify song counter (e.g., "Song 1/5") has aligned numbers
5. Start timer and verify time display has aligned digits
6. Adjust scroll speed and verify the multiplier aligns properly
7. Navigate between songs
8. Exit Performance Mode

---

## Success Criteria

Phase 3 is complete when:

1. All four numeric displays use `tabular-nums`
2. Song title uses `font-serif`
3. No dark theme colors were changed
4. No TypeScript errors
5. No ESLint warnings introduced
6. All functional regression tests pass
7. Stage readability is maintained or improved

---

## Why tabular-nums Matters

The `tabular-nums` CSS feature makes all digits the same width, preventing layout shift when numbers change:

**Without tabular-nums:**
```
Song 1/12   (narrow "1")
Song 10/12  (wider "10" shifts layout)
```

**With tabular-nums:**
```
Song  1/12  (all digits same width)
Song 10/12  (no layout shift)
```

This is especially important for:
- **Timer:** Prevents flickering as seconds change
- **Song Counter:** Keeps header stable when navigating
- **Scroll Speed:** Keeps control panel aligned

---

## Rollback Plan

If issues are discovered post-merge:

1. Revert the PR
2. Document the specific issue
3. Fix in a new branch before re-attempting

All changes are CSS-only and should not affect functionality.
