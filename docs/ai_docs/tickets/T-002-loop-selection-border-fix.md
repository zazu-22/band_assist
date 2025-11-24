# T-002: Loop Selection Border Visual Fix

**Status**: KNOWN LIMITATION
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
  background-size:
    2px 100%,
    100% 2px;
  background-position:
    0 0,
    0 0;
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

## Investigation Results

**Investigated**: 2025-11-21
**Status**: Known Limitation - Cannot be fixed with pure CSS

**Changes Made**:

- `public/alphatab-custom.css:30-38` - Added CSS with documentation of limitation

**Root Cause Analysis**:

After extensive investigation, the visual distortion is caused by **AlphaTab's internal rendering**:

1. **AlphaTab creates** `.at-selection` div with a child `<div>` element
2. **Child div has fixed dimensions**: `width: 100px; height: 100px`
3. **AlphaTab applies transform scaling**: `transform: translate(x, y) scale(scaleX, scaleY)` inline
4. **Scale values change** based on selection size (e.g., `scale(3.86274, 0.867)`)
5. **ALL visual properties** on the child div (borders, outlines, backgrounds) get scaled by the transform

**Why CSS Approaches Failed**:

All attempted CSS solutions failed because transforms scale the entire rendered box:

❌ **CSS dashed border** - Dashes stretch horizontally/vertically with scale
❌ **CSS outline** - Also gets scaled by transform
❌ **Repeating gradients** - Background patterns scale with element
❌ **Pseudo-elements** - Child pseudo-elements inherit parent transform
❌ **Parent styling** - Parent `.at-selection` has no dimensions
❌ **Counter-scaling** - Would need dynamic values for each selection size

**Attempted Solutions**:

1. Native CSS `border-style: dashed` → Stretches with transform
2. CSS `outline` with offset → Also stretches
3. Repeating linear gradients → Background scales with element
4. Pseudo-element with counter-scale → Would need dynamic CSS (not possible)
5. Parent element styling → Parent has no dimensions to style

**Current Implementation**:

Reverted to simple dashed border with documentation:

```css
.at-selection div {
  background: rgba(245, 158, 11, 0.08) !important;
  border: 2px dashed rgba(245, 158, 11, 0.6) !important;
  border-radius: 4px;
}
```

**Known Issue**: The dashes will stretch as the selection grows due to AlphaTab's transform scaling.

**Potential Future Solutions**:

To properly fix this would require one of:

1. **JavaScript override** - Modify `AlphaTabRenderer.tsx` to inject custom selection overlay that doesn't use the scaled child div
2. **SVG overlay** - Create separate SVG elements for selection borders positioned via JavaScript
3. **AlphaTab API** - Request feature from AlphaTab library to expose selection styling hooks
4. **Fork AlphaTab** - Modify the library's selection rendering internals

**Decision**: Leaving as-is. The visual issue is cosmetic and doesn't affect functionality. The selection is still clearly visible and usable.

**References**:

- [AlphaTab Styling Guide](https://alphatab.net/docs/guides/styling-player/)
- Element inspection revealed inline transform scaling on child div
