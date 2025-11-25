# shadcn/ui Migration Progress - Handoff Document

**Date:** 2025-11-25
**Status:** Phase 5.2 Complete - Layout System Implemented
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

---

## Remaining Work

### Phase 5.3: UI Components (Pending)

Migrate existing custom components to use shadcn primitives:

1. **ConfirmDialog** (`src/components/ui/ConfirmDialog.tsx`)
   - Replace with AlertDialog primitive
   - Keep variant system (danger/warning/info)
   - Remove manual focus trap code (Radix handles it)

2. **EmptyState** (`src/components/ui/EmptyState.tsx`)
   - Wrap with Card primitive
   - Update button to use Button primitive

3. **Create StatusBadge** (new)
   - Use Badge primitive with success/info/warning variants
   - Map song status: Performance Ready → success, In Progress → info, To Learn → warning

4. **Create StatCard** (new)
   - Use Card primitive
   - Props: title, value, subtitle, icon, variant

5. **Update Toast** (`src/components/ui/Toast.tsx`)
   - Update styles to use CSS variables

6. **Update ui/index.ts barrel export**

### Phase 5.4: Feature Components - Dashboard (Pending)

1. **Dashboard.tsx**
   - Replace stat cards (lines 34-85) with StatCard component
   - Replace song status badges with StatusBadge
   - Use Card for Billy's Wisdom section
   - Reduce mobile padding (p-4 sm:p-6 lg:p-10)

2. **Settings.tsx**
   - Replace manual tabs with Tabs primitive
   - Replace inputs with Input + Label
   - Replace buttons with Button variants

3. **Other pages** (SetlistManager, BandDashboard, ScheduleManager, etc.)
   - Apply consistent Card, Badge, Button usage

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
- `--sidebar-*` - Dedicated sidebar colors

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

---

## Testing Commands

```bash
npm run typecheck  # Verify TypeScript compiles
npm run lint       # Check for lint errors (some pre-existing in other files)
npm run dev        # Start dev server on port 3000
```

---

## Known Issues

1. **Pre-existing lint errors** in `PerformanceMode.tsx` and `PracticeRoom.tsx` (setState in useEffect) - unrelated to this migration

2. **Old Navigation.tsx still exists** - Now uses `useSidebar()` but will eventually be replaced by `layout/Sidebar.tsx`

---

## Next Session Recommendations

1. Start with Phase 5.3 - Migrate ConfirmDialog to AlertDialog
2. Create StatusBadge and StatCard components
3. Then proceed to Dashboard migration (Phase 5.4)
4. Test the app thoroughly after each component migration
