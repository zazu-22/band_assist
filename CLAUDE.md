# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Band Assist (Sharp Dressed Band) is a React SPA for band management. It helps bands manage songs, charts, setlists, practice schedules, and member assignments. The app uses Supabase for data persistence and authentication.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui, Radix UI, Supabase, AlphaTab (Guitar Pro rendering), Google Gemini AI

## Design System

The app follows a cohesive "Backstage Command Center". See **[docs/design-system.md](docs/design-system.md). When building new features or modifying existing pages, reference the design system to maintain visual consistency across the application.

### Components

The app uses a variety of components from the shadcn/ui component library.

## shadcn/ui Component Library

The app uses shadcn/ui with a custom theme (amber/gold primary, light+dark modes). Components are organized in three layers:

### Component Hierarchy

1. **Primitives** (`components/primitives/`) - Raw shadcn/ui components from the registry.
2. **UI Components** (`components/ui/`) - Domain-agnostic composed components built from primitives.
3. **Feature Components** - Page-level components that use UI components.

### Primitives Modification Policy

- Do not modify business logic, styling defaults, or component structure in primitives
- Acceptable modifications:
  - Adding `displayName` for React DevTools debugging
  - Adding type exports if needed for downstream components
  - Fixing touch target sizes for mobile accessibility (e.g., `h-11 sm:h-9`)
  - Updating focus styles for keyboard navigation (e.g., `focus-visible:` instead of `focus:`)
- When in doubt, compose a new component in `ui/` that wraps the primitive instead of modifying it

### Theme Variables

Located in `src/index.css`. Key semantic colors:

```css
--primary        /* Amber/gold - main brand color */
--secondary      /* Neutral secondary actions */
--destructive    /* Red - danger/delete actions */
--success        /* Green - positive status (custom) */
--warning        /* Amber - caution status (custom) */
--info           /* Blue - informational (custom) */
--background     /* Page background */
--card           /* Card backgrounds */
--muted          /* Muted/disabled elements */
--foreground     /* Primary text */
--muted-foreground /* Secondary text */
```

### Component Coding Standards

**Import Ordering:**

1. React (`import React, { ... } from 'react'`)
2. Third-party libraries (`lucide-react`, etc.)
3. Local components (`@/components/*`)
4. Types (`@/types` or `type { ... }`)
5. Utils (`@/lib/utils`)

**Performance Patterns:**

- Use `React.memo` for components that receive stable props
- Add explicit `displayName` to all `memo()` wrapped components
- Use `useCallback` for event handlers passed to child components
- Use `useMemo` for expensive computations

**Configuration Constants:**

```typescript
// Use SCREAMING_SNAKE_CASE with 'as const' for type safety
const VARIANT_CONFIG = {
  danger: { icon: Trash2, color: 'text-destructive' },
  warning: { icon: AlertTriangle, color: 'text-warning' },
} as const satisfies Record<VariantType, ConfigShape>;
```

**Dialog Callbacks:**

- Parent components should wrap `onCancel`/`onConfirm` in `useCallback`
- Prevents unnecessary re-renders when dialog state changes

### Touch Target Compliance

Primitives are configured for mobile-friendly touch targets:

- Buttons: `h-11 sm:h-9` (44px mobile, 36px desktop)
- Inputs: `h-11 sm:h-9`
- Select triggers: `h-11 sm:h-9`

## Important Patterns

### State Updates

Always use immutable updates:

```typescript
// Good
handleUpdateSong({ ...song, title: 'New Title' });
setSongs(songs.map(s => s.id === id ? updated : s));

// Bad - never mutate directly
song.title = 'New Title';
```

### URL Navigation

Use React Router's `useNavigate()` with explicit paths:

```typescript
const navigate = useNavigate();
navigate(`/songs/${songId}`);
navigate('/'); // Prefer over navigate(-1)
navigate('/', { replace: true }); // For redirects
```

### Authentication Flow (Supabase Mode)

1. App checks session on mount via Supabase auth listener
2. If session exists, fetch/create user's band
3. If no band, create default "My Band" with user as admin
4. Set band context in StorageService
5. Load band data

### Multi-Band Support

- Users can belong to multiple bands
- `BandSelector` component for switching
- `currentBandId` tracks active band
- Band change triggers full data reload

## Common Pitfalls

1. **AlphaTab Assets:** AlphaTab requires fonts and soundfont files. The Vite plugin automatically copies these to `/font` and `/soundfont` during build. If playback fails, verify these directories exist in the build output.

2. **Supabase Required:** The app requires Supabase configuration. Without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, the app will fail to start.

3. **TypeScript Strictness:** Project uses `"strict": true`. Properly type all props; avoid `any`.

4. **Direct URL Access:** Handle missing resources gracefully. `SongDetailRoute` shows toast and redirects to `/` if song not found.

5. **Navigation History:** Avoid `navigate(-1)`. Use explicit paths for reliable behavior with direct URL access.

6. **Band Context:** Always ensure `setCurrentBand()` is called before data operations to scope queries correctly.
