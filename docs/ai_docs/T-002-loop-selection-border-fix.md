# T-002: Loop Selection Border Visual Fix

**Status**: Ready for Implementation
**Priority**: Low
**Estimated Effort**: 30 minutes
**Last Updated**: 2025-11-21

## Overview

Fix the visual distortion in the loop selection border where dashes/dots stretch instead of dynamically adding more dashes as the selection box expands. Currently, the border appears to use a fixed image or pattern that scales, causing visual artifacts.

## Current State

### Existing Implementation

- **File**: `components/AlphaTabRenderer.tsx`
- **CSS**: Loop selection styling via AlphaTab's `.at-selection` CSS class
- **Current Behavior**: When dragging to select a loop range, the dotted border stretches existing dashes instead of adding more dashes
- **Visual Issue**: Creates distorted, elongated dashes that look unprofessional

### Expected Behavior

Dotted borders should maintain consistent dash spacing and size, dynamically adding more dashes as the selection area grows.

## Technical Context

### How AlphaTab Renders Loop Selection

AlphaTab automatically adds the `.at-selection` CSS class to elements representing the selected loop range. The library creates a `<div>` overlay that shows the visual selection.

**Current CSS** (likely in `public/alphatab-custom.css` or inline):
```css
.at-selection div {
  background: rgba(245, 158, 11, 0.08) !important;
  border: 1px dashed rgba(245, 158, 11, 0.4);
}
```

### Root Cause

The issue is likely one of:
1. Using `background-image` with a pattern instead of native CSS `border-style: dashed`
2. SVG stroke pattern that scales instead of repeats
3. AlphaTab internal rendering using a scalable border image

## Implementation Plan

### Step 1: Inspect Current Styling

Check `public/alphatab-custom.css` for loop selection styles.

### Step 2: Update CSS

Replace any pattern-based border with native CSS dashed border:

```css
.at-selection div {
  background: rgba(245, 158, 11, 0.08) !important;
  border: 2px dashed rgba(245, 158, 11, 0.6) !important;
  border-radius: 4px;
  /* Ensure border scales properly */
  background-clip: padding-box;
  box-sizing: border-box;
}

/* Alternative: Use outline instead of border if border causes layout issues */
.at-selection div {
  background: rgba(245, 158, 11, 0.08) !important;
  outline: 2px dashed rgba(245, 158, 11, 0.6);
  outline-offset: -2px;
}
```

### Step 3: Test Visual Appearance

1. Load a Guitar Pro file in Practice Room
2. Shift+Click to set loop start
3. Shift+Click on a measure far away to create a large selection
4. Verify dashes maintain consistent spacing and don't stretch

### Alternative Approach: SVG Pattern

If native CSS dashed border doesn't work due to AlphaTab rendering:

```css
.at-selection div {
  background: rgba(245, 158, 11, 0.08) !important;
  border: none !important;
  box-shadow:
    0 0 0 2px rgba(245, 158, 11, 0.6),
    inset 0 0 0 2px rgba(245, 158, 11, 0.3);
  /* Use repeating linear gradient for dash effect */
  background-image:
    repeating-linear-gradient(
      0deg,
      rgba(245, 158, 11, 0.6) 0px,
      rgba(245, 158, 11, 0.6) 8px,
      transparent 8px,
      transparent 16px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(245, 158, 11, 0.6) 0px,
      rgba(245, 158, 11, 0.6) 8px,
      transparent 8px,
      transparent 16px
    );
  background-size: 2px 100%, 100% 2px;
  background-position: 0 0, 0 0;
  background-repeat: repeat-y, repeat-x;
}
```

## Testing Plan

### Visual Testing

- [ ] Small loop selection (2-3 measures): Dashes look normal
- [ ] Medium loop selection (1-2 lines): Dashes maintain spacing
- [ ] Large loop selection (full page): Dashes don't stretch
- [ ] Different zoom levels: Border scales appropriately
- [ ] Multiple loop selections: Clearing and re-selecting works

### Cross-Browser Testing

- [ ] Chrome (primary)
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Edge

## Acceptance Criteria

1. ✅ Loop selection border uses consistent dash spacing
2. ✅ Dashes don't stretch or distort when selection grows
3. ✅ Visual appearance matches project theme (amber)
4. ✅ Works across different screen sizes and zoom levels
5. ✅ No performance degradation

---

**Files to Modify:**
- `public/alphatab-custom.css` (or create if doesn't exist)
- Possibly: `index.html` (to link CSS file if not already linked)
