# shadcn/ui Migration Progress - Handoff Document

**Date:** 2025-11-26
**Status:** Phase 5.4 Complete - Dashboard & Settings Migrated
**Approach:** Clean Architecture (full redesign for long-term maintainability)

---

## Summary

This document tracks progress on migrating Band Assist to shadcn/ui with a complete UI/UX overhaul including:
- Custom theme from tweakcn.com (amber/gold primary, light+dark modes)
- Improved mobile responsiveness
- Standardized component library
- Light/dark mode toggle

---

## Completed Work

### Phase 5.1: Foundation ✅

**Files Created:**
- `components.json` - shadcn configuration
- `src/lib/utils.ts` - `cn()` class merge utility
- `src/index.css` - Complete theme with CSS variables (light/dark), animations
- `index.html` - Updated with theme fonts (Barlow, Brawler, JetBrains Mono), dark class

**Primitive Components (`src/components/primitives/`):**
- `button.tsx` - Button with variants (default, destructive, outline, secondary, ghost, link)
- `card.tsx` - Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- `badge.tsx` - Badge with custom variants (success, info, warning for song status)
- `separator.tsx` - Visual divider
- `dialog.tsx` - Modal dialog
- `alert-dialog.tsx` - Confirmation dialog
- `sheet.tsx` - Slide-out drawer (for mobile nav)
- `scroll-area.tsx` - Custom scrollable area
- `tabs.tsx` - Tab navigation
- `tooltip.tsx` - Hover tooltips
- `dropdown-menu.tsx` - Dropdown menus
- `switch.tsx` - Toggle switch
- `input.tsx` - Text input
- `label.tsx` - Form label
- `select.tsx` - Select dropdown
- `avatar.tsx` - User avatar
- `collapsible.tsx` - Collapsible section
- `index.ts` - Barrel export

**Dependencies Installed:**
- `clsx`, `tailwind-merge`, `class-variance-authority`
- All `@radix-ui/react-*` primitives
- `next-themes`

### Phase 5.2: Layout System ✅

**Files Created:**
- `src/components/ui/ThemeProvider.tsx` - Theme context with light/dark/system support
- `src/components/ui/ThemeToggle.tsx` - Theme switcher dropdown
- `src/components/ui/VisuallyHidden.tsx` - Accessibility helper
- `src/components/layout/SidebarProvider.tsx` - Sidebar state context (collapsed, mobileOpen)
- `src/components/layout/Sidebar.tsx` - New sidebar using shadcn primitives
- `src/components/layout/MobileNav.tsx` - Mobile drawer using Sheet primitive
- `src/components/layout/AppShell.tsx` - Main layout wrapper
- `src/components/layout/index.ts` - Barrel export
- `src/hooks/useMediaQuery.ts` - Responsive breakpoint hooks

**Files Modified:**
- `src/App.tsx` - Wrapped with ThemeProvider + SidebarProvider, removed old sidebar state
- `src/components/Navigation.tsx` - Updated to use `useSidebar()` instead of `useAppContext()`
- `src/hooks/useLayoutShortcuts.ts` - Updated to use `useSidebar()` hook

**Key Changes:**
- Sidebar state moved from AppContext to dedicated SidebarProvider
- AppContext simplified (removed sidebarCollapsed, mobileNavOpen)
- Mobile navigation uses Sheet primitive (better focus trap, animations)
- Theme toggle added to sidebar footer

### Phase 5.3: UI Components ✅

**Files Modified:**
- `src/components/ui/ConfirmDialog.tsx` - Migrated to use AlertDialog primitive
  - Now uses AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, etc.
  - Removed manual focus trap code (Radix handles it)
  - Kept variant system (danger/warning/info) with semantic color classes
  - Uses `cn()` utility for class merging
  - React.memo for performance optimization
  - VARIANT_CONFIG as const at module level
- `src/components/ui/EmptyState.tsx` - Updated to use Card + Button primitives
  - Wrapped content in Card with dashed border styling
  - Action button now uses Button primitive with default variant
  - Uses semantic theme colors (muted, foreground, muted-foreground)
  - Added aria-live="polite" and role="status" for accessibility
  - React.memo for performance optimization
- `src/components/ui/Toast.tsx` - Updated to use CSS variables
  - Background uses `var(--card)`, border uses `var(--border)`
  - Color uses `var(--card-foreground)`
  - Border colors use semantic theme variables (border-success, border-warning, etc.)
- `src/components/primitives/badge.tsx` - Added displayName for React DevTools

**Files Created:**
- `src/components/ui/StatusBadge.tsx` - Song status badge component
  - Maps song status to Badge variants: Performance Ready → success, In Progress → info, To Learn → warning
  - STATUS_VARIANT_MAP as const satisfies Record<...> at module level
  - Type-safe with Song['status'] type
  - React.memo for performance optimization
- `src/components/ui/ThemeToggle.tsx` - Minor accessibility cleanup
  - Removed redundant title attribute (aria-label is sufficient for screen readers)
- `src/components/ui/StatCard.tsx` - Dashboard statistic card component
  - Uses Card primitive with CardContent
  - Props: title, value (string | number), subtitle, icon, variant
  - VARIANT_CONFIG as const satisfies Record<...> at module level
  - React.memo for performance optimization
- `src/components/ui/index.ts` - Updated barrel export
  - Added exports for StatusBadge, StatCard
  - Added exports for ThemeProvider, useTheme, ThemeToggle, VisuallyHidden

**Theme Extensions (src/index.css):**
- Added `--success`, `--warning`, `--info` semantic color variables
- Both light and dark mode variants defined
- Tailwind theme mappings via `@theme inline` block
- Classes like `bg-success`, `text-warning`, `border-info` now available

**Testing Results:**
- TypeScript compilation: PASS
- Production build: PASS (~591 kB bundle)
- Dev server: PASS (starts on port 3000)
- Keyboard navigation (ConfirmDialog): ESC closes, focus trapped, overlay click cancels

### Phase 5.4: Feature Components - Dashboard & Settings ✅

**Files Modified:**

1. **`src/components/Dashboard.tsx`** - Complete migration to shadcn/ui
   - Replaced 4 inline stat cards with `StatCard` component
     - Total Setlist: default variant with Disc icon, value as number, "Songs" subtitle
     - Stage Ready: success variant with CheckCircle2 icon
     - To Learn: warning variant with Activity icon
     - Next Gig: info variant with CalendarDays icon, dynamic title/subtitle
   - Replaced inline song status badges with `StatusBadge` component
   - Wrapped Setlist Progress section with `Card`, `CardHeader`, `CardTitle`, `CardContent`
   - Wrapped Billy's Wisdom section with `Card` + `CardContent`
   - Changed song list items from `<div>` to `<button>` for proper accessibility
   - Reduced mobile padding (`p-4 sm:p-6 lg:p-10`)
   - Updated all colors to semantic theme variables (text-foreground, bg-muted, etc.)
   - Added `React.memo` wrapper for performance
   - Extracted helper functions (`formatGigDate`, `buildGigSubtitle`) outside component
   - Added `displayName` for React DevTools

2. **`src/components/Settings.tsx`** - Complete migration to shadcn/ui
   - Replaced manual tab implementation with Radix `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
     - Tabs wrapper now contains header and content for proper ARIA associations
     - Keyboard navigation works automatically (arrow keys, Home/End)
     - TabsContent used for each tab panel with fade-in animation
   - Replaced all `<input>` elements with `Input` primitive
   - Replaced all buttons with `Button` primitive
     - Primary actions: default variant (amber)
     - Secondary actions: secondary variant
     - Icon buttons: ghost variant with size="icon"
     - Delete buttons: hover:text-destructive styling
   - Replaced member avatars with `Avatar` + `AvatarFallback` primitives
   - Replaced role tags with `Badge` variant="secondary" with group hover effect
   - Used `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` for all sections
   - Export/Import cards use nested Cards with bg-muted/50 for visual hierarchy
   - Warning section uses Card with border-destructive/30 and bg-destructive/5
   - Added `React.memo` wrapper for performance
   - Wrapped all handlers in `useCallback` for stable references
   - Extracted `INITIAL_DIALOG_STATE` as const at module level
   - Added `displayName` for React DevTools

**Key Improvements:**
- All colors now use semantic theme variables (works in light/dark mode)
- Proper accessibility with Radix primitives (focus trap, keyboard nav, ARIA)
- Consistent component usage across Dashboard and Settings
- Mobile-responsive padding (p-4 on mobile, p-6 on tablet, p-10 on desktop)
- Performance optimized with memo and useCallback

**Testing Results:**
- TypeScript compilation: PASS
- Production build: PASS (~588 kB bundle, slightly smaller than before)
- Dev server: PASS
- No new lint errors in migrated files

---

## Remaining Work

### Phase 5.5: Polish (Pending)

1. **Mobile responsiveness audit**
   - Test scroll-hiding header behavior
   - Verify touch targets (44x44px min)
   - Test tablet breakpoints

2. **Animation refinement**
   - Verify all transitions respect `prefers-reduced-motion`
   - Test Sheet/Dialog animations

3. **Accessibility audit**
   - ARIA labels
   - Keyboard navigation
   - Color contrast verification

4. **Other pages** (SetlistManager, BandDashboard, ScheduleManager, etc.)
   - Apply consistent Card, Badge, Button usage

### Phase 6: Quality Review (Pending)

- Code review with parallel agents
- Simplicity/DRY check
- Bug/functional correctness check
- Convention adherence check

### Phase 7: Summary (Pending)

- Document what was built
- Update CLAUDE.md with shadcn patterns
- List all modified files

---

## Architecture Reference

### Folder Structure (Clean Architecture)
```
src/
├── components/
│   ├── primitives/     # Raw shadcn components (never modify directly)
│   ├── ui/             # Composed UI components (domain-agnostic)
│   ├── layout/         # Layout-specific (AppShell, Sidebar, MobileNav)
│   └── [feature].tsx   # Page components
├── lib/
│   └── utils.ts        # cn() helper
└── hooks/
    ├── useMediaQuery.ts
    └── useLayoutShortcuts.ts
```

### Theme Variables

Located in `src/index.css`. Key semantic colors:
- `--primary` - Amber/gold (oklch(0.7686 0.1647 70.0804))
- `--background` - Page background
- `--card` - Card backgrounds
- `--destructive` - Red for danger actions
- `--success` - Green for positive status (custom addition)
- `--warning` - Amber for caution status (custom addition)
- `--info` - Blue for informational status (custom addition)
- `--sidebar-*` - Dedicated sidebar colors

Note: `--success`, `--warning`, and `--info` were added as custom semantic colors
to extend the base shadcn/ui theme. These support the status indicator variants
used in Badge, StatCard, and ConfirmDialog components.

### Provider Hierarchy
```tsx
<ThemeProvider defaultTheme="dark">
  <SidebarProvider>
    <AppContext.Provider>
      <Routes>...</Routes>
    </AppContext.Provider>
  </SidebarProvider>
</ThemeProvider>
```

### Coding Standards

**Import Ordering:**
1. React (`import React, { ... } from 'react'`)
2. Third-party libraries (`lucide-react`, etc.)
3. Local components (`@/components/*`)
4. Types (`@/types` or `type { ... }`)
5. Utils (`@/lib/utils`)

**Component Patterns:**
- Use `React.memo` for components that receive stable props
- Add explicit `displayName` to all `memo()` wrapped components
- Use `SCREAMING_SNAKE_CASE` for module-level config objects with `as const`
- Document complex behavior with block comments (see ConfirmDialog as example)
- Use `useCallback` for event handlers passed to child components

**Callback Stability:**
- Parent components should wrap callbacks passed to dialogs in `useCallback`
- This prevents unnecessary re-renders when dialog state changes

---

## Testing Commands

```bash
npm run typecheck  # Verify TypeScript compiles
npm run lint       # Check for lint errors (some pre-existing in other files)
npm run dev        # Start dev server on port 3000
```

---

## Known Issues

1. **Pre-existing lint errors** in `PerformanceMode.tsx`, `PracticeRoom.tsx`, `SongDetail.tsx`, `AppShell.tsx`, and `ResizablePanel.tsx` (refs in render, setState in useEffect) - unrelated to this migration

2. **Old Navigation.tsx still exists** - Now uses `useSidebar()` but will eventually be replaced by `layout/Sidebar.tsx`

3. **Unit tests needed** - The following components should have unit tests added:
   - `ConfirmDialog`: keyboard navigation, ESC key handling, callback invocation
   - `StatusBadge`: variant mapping for all three status types
   - `StatCard`: icon rendering, variant styling, subtitle display
   - `EmptyState`: action button rendering, accessibility attributes
   - `Dashboard`: stat card rendering, song list rendering, navigation
   - `Settings`: tab switching, member CRUD, role CRUD, import/export

4. **StatCard value constraint** - The `value` prop only accepts `string | number`. If formatted content is needed (e.g., `<span>5 <small>/ 10</small></span>`), consider:
   - Creating a `FormattedStatCard` variant with `value: React.ReactNode`
   - Using a render prop pattern: `renderValue?: () => React.ReactNode`
   - Phase 5.4 verified all dashboard stats work with the current constraint

5. **Toast uses --popover variable** - Toast.tsx uses `--popover` instead of `--card` for background styling. This is semantically correct since toasts are floating UI elements (like popovers), not embedded content (like cards). Currently `--popover` and `--card` have identical values in the theme, but using `--popover` allows future customization if toast styling needs to diverge from card styling.

---

## Next Session Recommendations

1. Phase 5.5 - Polish and audit
   - Mobile responsiveness testing
   - Accessibility audit
   - Animation verification
2. Migrate remaining pages (SetlistManager, BandDashboard, ScheduleManager) to use shadcn primitives
3. Phase 6 - Quality review
4. Phase 7 - Documentation updates
