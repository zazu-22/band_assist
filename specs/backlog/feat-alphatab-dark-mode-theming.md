# Feature: AlphaTab Dark Mode & Design System Integration

| Field | Value |
| ----- | ----- |
| **Status** | Backlog |
| **Priority** | Low |
| **Type** | Feature |
| **Created** | 2025-12-02 |

---

## Summary

Integrate AlphaTab's theming capabilities with the app's design system to support dark mode and consistent styling. AlphaTab supports full color customization via `display.resources` settings, allowing notation colors to match our theme.

## Background

Research confirmed AlphaTab supports theming:
- **Documentation**: https://alphatab.net/docs/reference/settings/display/resources/
- **GitHub Discussion**: https://github.com/CoderLine/alphaTab/discussions/1558

Currently, AlphaTabRenderer uses hardcoded white background with black notation, which doesn't adapt to the app's dark mode.

## Problem

**Current State:**
- AlphaTabRenderer always renders with white background
- LazyAlphaTab fallback uses `bg-white` to match (prevents flash)
- No integration with app's theme context
- Poor UX in dark mode (bright white rectangle in dark UI)

**User Impact:**
- Jarring visual experience when using dark mode
- Eye strain from bright notation display in low-light conditions
- Inconsistent with rest of app's theming

## Proposed Solution

### 1. Define AlphaTab Theme Tokens

Extend design system with AlphaTab-specific color tokens:

```css
/* src/index.css - add to theme variables */
:root {
  /* AlphaTab notation colors */
  --alphatab-background: 255 255 255;      /* white */
  --alphatab-staff-line: 0 0 0 / 0.3;      /* semi-transparent black */
  --alphatab-bar-separator: 0 0 0;          /* black */
  --alphatab-main-glyph: 0 0 0;             /* black - notes, rests */
  --alphatab-secondary-glyph: 100 100 100;  /* gray - dynamics, etc */
  --alphatab-bar-number: 0 0 0;             /* black */
  --alphatab-highlight: 245 158 11;         /* amber-500 - playback */
}

.dark {
  --alphatab-background: 24 24 27;          /* zinc-900 */
  --alphatab-staff-line: 255 255 255 / 0.3; /* semi-transparent white */
  --alphatab-bar-separator: 255 255 255;    /* white */
  --alphatab-main-glyph: 255 255 255;       /* white */
  --alphatab-secondary-glyph: 161 161 170;  /* zinc-400 */
  --alphatab-bar-number: 161 161 170;       /* zinc-400 */
  --alphatab-highlight: 245 158 11;         /* amber-500 */
}
```

### 2. Create Theme Hook

```typescript
// src/hooks/useAlphaTabTheme.ts
import { useMemo } from 'react';

interface AlphaTabTheme {
  background: string;
  staffLineColor: string;
  barSeparatorColor: string;
  mainGlyphColor: string;
  secondaryGlyphColor: string;
  barNumberColor: string;
}

export function useAlphaTabTheme(): AlphaTabTheme {
  // Read from CSS variables or theme context
  const isDark = document.documentElement.classList.contains('dark');

  return useMemo(() => ({
    background: isDark ? '#18181b' : '#ffffff',
    staffLineColor: isDark ? '#ffffff80' : '#00000080',
    barSeparatorColor: isDark ? '#ffffff' : '#000000',
    mainGlyphColor: isDark ? '#ffffff' : '#000000',
    secondaryGlyphColor: isDark ? '#a1a1aa' : '#646464',
    barNumberColor: isDark ? '#a1a1aa' : '#000000',
  }), [isDark]);
}
```

### 3. Update AlphaTabRenderer

Add theme support to AlphaTabRenderer initialization:

```typescript
// In AlphaTabRenderer.tsx - update API initialization
const api = new AlphaTabApi(containerRef.current, {
  // ... existing settings
  display: {
    resources: {
      staffLineColor: theme.staffLineColor,
      barSeparatorColor: theme.barSeparatorColor,
      mainGlyphColor: theme.mainGlyphColor,
      secondaryGlyphColor: theme.secondaryGlyphColor,
      barNumberColor: theme.barNumberColor,
    },
  },
});
```

### 4. Handle Dynamic Theme Changes

```typescript
// Watch for theme changes and update AlphaTab
useEffect(() => {
  if (apiRef.current) {
    apiRef.current.settings.display.resources.staffLineColor =
      alphaTab.model.Color.fromJson(theme.staffLineColor);
    // ... update other colors
    apiRef.current.updateSettings();
  }
}, [theme]);
```

### 5. Update Playback Highlight CSS

```css
/* Playback highlight - uses CSS classes */
.at-highlight {
  fill: rgb(var(--alphatab-highlight));
  stroke: rgb(var(--alphatab-highlight));
}

.at-cursor-bar {
  background: rgb(var(--alphatab-highlight) / 0.25);
}

.at-selection div {
  background: rgb(var(--alphatab-highlight) / 0.1);
}
```

### 6. Update LazyAlphaTab Fallback

Once theming is implemented, update fallback to use theme-aware background:

```tsx
<div className="flex h-full min-h-[200px] items-center justify-center bg-background px-4">
```

## Files Affected

- `src/index.css` - Add AlphaTab theme tokens
- `src/hooks/useAlphaTabTheme.ts` - New hook (create)
- `src/components/AlphaTabRenderer.tsx` - Add theme integration
- `src/components/LazyAlphaTab.tsx` - Update fallback background
- `docs/design-system.md` - Document AlphaTab theming

## Acceptance Criteria

- [ ] AlphaTab notation adapts to light/dark mode
- [ ] Theme changes apply without page reload
- [ ] Playback highlights use accent color (amber)
- [ ] No flash when switching themes
- [ ] LazyAlphaTab fallback matches theme
- [ ] Design system documentation updated
- [ ] Colors accessible (sufficient contrast)

## Testing Strategy

1. **Visual Testing:**
   - Toggle between light/dark mode
   - Verify all notation elements change color
   - Check playback highlights are visible in both modes

2. **Dynamic Theme Testing:**
   - Change theme while music is playing
   - Verify smooth transition without re-render flash

3. **Accessibility Testing:**
   - Verify contrast ratios meet WCAG AA
   - Test with color blindness simulators

## Dependencies

- None (AlphaTab already supports theming)

## Complexity Assessment

- **Effort**: Medium
- **Risk**: Low (additive feature, no breaking changes)
- **Impact**: High for dark mode users

## Notes

- AlphaTab's `display.resources` accepts hex colors (#RGB, #RRGGBB, #RRGGBBAA)
- Dynamic updates require calling `api.updateSettings()` after changing settings
- Consider debouncing theme change updates to avoid rapid re-renders
