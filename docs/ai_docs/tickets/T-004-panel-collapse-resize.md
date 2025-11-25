# T-004: Panel Collapse & Resize Functionality

**Status**: Ready for Implementation
**Priority**: Medium
**Estimated Effort**: 6-8 hours
**Last Updated**: 2025-11-25

## Overview

Implement collapsible and resizable panels throughout the application to improve space utilization and user control. This includes making the main navigation sidebar collapsible with a toggle, adding resizable panels in key views, and enhancing mobile responsiveness with a drawer navigation pattern.

## Current State

### What's Already Implemented

The codebase now uses **React Router v6** with layout routes and has basic responsive patterns:

**Navigation Component** (`components/Navigation.tsx`):
- Already responsive: `w-20` on mobile, `lg:w-64` on desktop
- Icon-only on small screens, labels shown on `lg` breakpoint
- Uses `useNavigate()` for explicit path navigation

**PracticeRoom** (`components/PracticeRoom.tsx`):
- Has `showSongList` state for toggling song list visibility
- Uses `hidden md:block` pattern for responsive sidebar
- Fixed width of `w-64` when visible

**SongDetail** (`components/SongDetail.tsx`):
- Responsive AI sidebar: `flex-col` on mobile, `lg:flex-row` on desktop
- Sidebar takes `h-1/2` on mobile, `lg:w-96` on desktop
- Full-screen route (no Navigation sidebar)

**App Layout** (`App.tsx`):
- Layout route pattern with `<Outlet />` for sidebar pages
- Flex container with Navigation + main content
- Full-screen routes (song detail, performance) render without sidebar

### Remaining Gaps

- ❌ No user-controlled sidebar collapse toggle (auto-collapse only)
- ❌ Panels are fixed-width, not resizable
- ❌ No mobile drawer pattern for Navigation (just shrinks to icons)
- ❌ No panel state persistence across sessions
- ❌ No smooth collapse/expand animations
- ❌ No keyboard shortcuts for panel control
- ❌ No `useBreakpoint` hook for programmatic responsive behavior

## Architecture Context

### Current Tech Stack

- **Framework**: React 19 with TypeScript
- **Routing**: React Router v6 with layout routes
- **Styling**: Tailwind CSS (locally installed)
- **State**: Context API via `AppContext` + `useAppContext()`
- **Icons**: Lucide React

### Component Hierarchy

```
App.tsx (root state, context provider, route definitions)
├── Routes
│   ├── AppLayout (layout route with sidebar)
│   │   ├── Navigation.tsx (sidebar)
│   │   └── <Outlet /> (child routes)
│   │       ├── Dashboard
│   │       ├── PracticeRoom
│   │       ├── SetlistManager
│   │       ├── ScheduleManager
│   │       ├── BandDashboard
│   │       └── Settings
│   │
│   └── Full-Screen Routes (no sidebar)
│       ├── SongDetailRoute → SongDetail
│       └── PerformanceMode
```

### Key Patterns to Follow

1. **Layout Route Pattern**: Navigation lives in `AppLayout`, not `App.tsx`
2. **Context for Shared State**: Use `AppContext` for layout preferences
3. **Tailwind Responsive Classes**: Build on existing `lg:` and `md:` patterns
4. **Explicit Navigation**: Use `navigate('/path')`, not `navigate(-1)`

## Implementation Plan

### Phase 1: Collapsible Sidebar with User Toggle

#### 1.1 Add Layout State to AppContext

**File**: `App.tsx`

Add layout preferences to the context:

```typescript
// Add to AppContextType interface
interface AppContextType {
  // ... existing fields
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

// In App component, add state:
const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
  try {
    return localStorage.getItem('sdb_sidebar_collapsed') === 'true';
  } catch {
    return false;
  }
});

// Persist to localStorage
useEffect(() => {
  localStorage.setItem('sdb_sidebar_collapsed', String(sidebarCollapsed));
}, [sidebarCollapsed]);

// Add to context value (inside useMemo)
const contextValue = useMemo(() => ({
  // ... existing fields
  sidebarCollapsed,
  setSidebarCollapsed,
}), [/* ... existing deps */, sidebarCollapsed]);
```

#### 1.2 Update Navigation Component

**File**: `components/Navigation.tsx`

Add collapse toggle button and transition animations:

```typescript
import { useAppContext } from '../App';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Navigation: React.FC<NavigationProps> = ({ currentView }) => {
  const { sidebarCollapsed, setSidebarCollapsed } = useAppContext();
  const navigate = useNavigate();

  return (
    <nav className={`
      sticky top-0 h-screen bg-zinc-900 text-zinc-100 flex flex-col
      transition-all duration-300 ease-in-out
      ${sidebarCollapsed ? 'w-16' : 'w-20 lg:w-64'}
    `}>
      {/* Header with collapse toggle */}
      <div className="h-16 flex items-center justify-between px-3 border-b border-zinc-800">
        {!sidebarCollapsed && (
          <div className="hidden lg:flex items-center gap-2 overflow-hidden">
            <Music className="text-amber-500 shrink-0" size={24} />
            <span className="font-bold text-sm truncate">SHARP DRESSED</span>
          </div>
        )}
        {sidebarCollapsed && (
          <Music className="text-amber-500 mx-auto" size={24} />
        )}

        {/* Collapse toggle - visible on lg screens */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav items - center icons when collapsed */}
      <div className="flex-1 overflow-y-auto py-2">
        {mainNavItems.map((item) => (
          <button
            key={item.view}
            onClick={() => navigate(viewToPath[item.view])}
            className={`
              w-full flex items-center gap-3 px-4 py-3
              hover:bg-zinc-800 transition-colors
              ${sidebarCollapsed ? 'justify-center px-2' : ''}
              ${isActive(item.view) ? 'bg-zinc-800 border-l-4 border-amber-500' : ''}
            `}
            title={item.label}
          >
            {item.icon}
            {!sidebarCollapsed && (
              <span className="hidden lg:block text-sm font-medium truncate">
                {item.label}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};
```

#### 1.3 Update AppLayout

**File**: `App.tsx` (AppLayout component)

Ensure layout responds to sidebar state:

```typescript
const AppLayout: React.FC = () => {
  const location = useLocation();
  const { sidebarCollapsed } = useAppContext();

  // ... currentView detection logic

  return (
    <div className="flex min-h-screen bg-zinc-950 font-sans text-zinc-100">
      <Navigation currentView={currentView} />
      <main className={`
        flex-1 h-screen overflow-y-auto
        transition-all duration-300 ease-in-out
      `}>
        <Outlet />
      </main>
    </div>
  );
};
```

### Phase 2: Mobile Drawer Navigation

#### 2.1 Add Mobile Drawer State

**File**: `App.tsx`

```typescript
// Add to context
interface AppContextType {
  // ... existing
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

// In App component
const [mobileNavOpen, setMobileNavOpen] = useState(false);
```

#### 2.2 Create Drawer Overlay

**File**: `App.tsx` (AppLayout component)

```typescript
const AppLayout: React.FC = () => {
  const { mobileNavOpen, setMobileNavOpen } = useAppContext();
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, setMobileNavOpen]);

  return (
    <div className="flex min-h-screen bg-zinc-950 font-sans text-zinc-100">
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar - drawer on mobile, static on desktop */}
      <div className={`
        lg:relative lg:translate-x-0
        fixed top-0 left-0 h-full z-50
        transform transition-transform duration-300 ease-in-out
        ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Navigation currentView={currentView} />
      </div>

      {/* Mobile menu button */}
      <button
        onClick={() => setMobileNavOpen(true)}
        className="fixed top-4 left-4 z-30 p-2 bg-zinc-900 rounded-lg shadow-lg lg:hidden"
      >
        <Menu size={24} />
      </button>

      <main className="flex-1 h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
```

### Phase 3: Resizable Panels

#### 3.1 Create ResizablePanel Component

**File**: `components/ui/ResizablePanel.tsx`

```typescript
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GripVertical } from 'lucide-react';

interface ResizablePanelProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
  side?: 'left' | 'right';
  className?: string;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  defaultWidth = 256,
  minWidth = 180,
  maxWidth = 480,
  storageKey,
  side = 'left',
  className = '',
}) => {
  const [width, setWidth] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(`sdb_panel_${storageKey}`);
      if (saved) return Math.max(minWidth, Math.min(maxWidth, parseInt(saved, 10)));
    }
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const newWidth = side === 'left'
      ? e.clientX - rect.left
      : rect.right - e.clientX;
    setWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
  }, [minWidth, maxWidth, side]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    if (storageKey) {
      localStorage.setItem(`sdb_panel_${storageKey}`, String(width));
    }
  }, [storageKey, width]);

  useEffect(() => {
    if (!isResizing) return;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handlePosition = side === 'left' ? 'right-0' : 'left-0';

  return (
    <div
      ref={panelRef}
      className={`relative shrink-0 ${className}`}
      style={{ width }}
    >
      {children}

      {/* Resize handle */}
      <div
        className={`
          absolute top-0 ${handlePosition} w-1 h-full cursor-col-resize
          hover:bg-amber-500/50 transition-colors group
          ${isResizing ? 'bg-amber-500' : 'bg-transparent'}
        `}
        onMouseDown={() => setIsResizing(true)}
      >
        <div className={`
          absolute top-1/2 -translate-y-1/2
          ${side === 'left' ? 'translate-x-1/2' : '-translate-x-1/2'}
          opacity-0 group-hover:opacity-100 transition-opacity
          bg-zinc-700 rounded p-0.5
        `}>
          <GripVertical size={12} className="text-zinc-400" />
        </div>
      </div>
    </div>
  );
};
```

#### 3.2 Create useBreakpoint Hook

**File**: `hooks/useBreakpoint.ts`

```typescript
import { useState, useEffect } from 'react';

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export const useBreakpoint = (): Breakpoint => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg');

  useEffect(() => {
    const getBreakpoint = (): Breakpoint => {
      const width = window.innerWidth;
      if (width >= BREAKPOINTS['2xl']) return '2xl';
      if (width >= BREAKPOINTS.xl) return 'xl';
      if (width >= BREAKPOINTS.lg) return 'lg';
      if (width >= BREAKPOINTS.md) return 'md';
      return 'sm';
    };

    const handleResize = () => setBreakpoint(getBreakpoint());
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
};

export const useIsMobile = (): boolean => {
  const bp = useBreakpoint();
  return bp === 'sm' || bp === 'md';
};

export const useIsDesktop = (): boolean => {
  const bp = useBreakpoint();
  return bp === 'lg' || bp === 'xl' || bp === '2xl';
};
```

#### 3.3 Apply to PracticeRoom

**File**: `components/PracticeRoom.tsx`

```typescript
import { ResizablePanel } from './ui/ResizablePanel';
import { useIsMobile } from '../hooks/useBreakpoint';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export const PracticeRoom: React.FC<PracticeRoomProps> = ({ ... }) => {
  const isMobile = useIsMobile();
  const [showSongList, setShowSongList] = useState(!isMobile);

  // Auto-hide on mobile when song selected
  useEffect(() => {
    if (isMobile && selectedSong) {
      setShowSongList(false);
    }
  }, [isMobile, selectedSong]);

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100">
      {/* Toolbar */}
      <div className="h-16 border-b border-zinc-800 bg-zinc-900 flex items-center px-4 shrink-0">
        <button
          onClick={() => setShowSongList(!showSongList)}
          className="p-2 hover:bg-zinc-800 rounded-lg mr-2"
          title={showSongList ? "Hide songs" : "Show songs"}
        >
          {showSongList ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>
        {/* ... rest of toolbar */}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Song List - resizable on desktop, fixed on mobile */}
        {showSongList && (
          isMobile ? (
            <div className="w-64 bg-zinc-900 border-r border-zinc-800 overflow-y-auto shrink-0">
              {/* Song list content */}
            </div>
          ) : (
            <ResizablePanel
              defaultWidth={256}
              minWidth={200}
              maxWidth={400}
              storageKey="practice_songlist"
              className="bg-zinc-900 border-r border-zinc-800 overflow-y-auto"
            >
              {/* Song list content */}
            </ResizablePanel>
          )
        )}

        {/* Main Stage */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Chart viewer content */}
        </div>
      </div>
    </div>
  );
};
```

### Phase 4: Keyboard Shortcuts (Optional)

#### 4.1 Create useKeyboardShortcuts Hook

**File**: `hooks/useKeyboardShortcuts.ts`

```typescript
import { useEffect } from 'react';
import { useAppContext } from '../App';

export const useLayoutShortcuts = () => {
  const { sidebarCollapsed, setSidebarCollapsed } = useAppContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + B = toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarCollapsed, setSidebarCollapsed]);
};
```

Use in `AppLayout`:

```typescript
const AppLayout: React.FC = () => {
  useLayoutShortcuts();
  // ... rest of component
};
```

## Testing Plan

### Functional Testing

- [ ] Sidebar collapse toggle works on desktop
- [ ] Collapsed state persists across page refresh
- [ ] Mobile drawer opens/closes correctly
- [ ] Drawer closes on route change
- [ ] ResizablePanel drag works smoothly
- [ ] Panel widths persist in localStorage
- [ ] Keyboard shortcut (Cmd+B) toggles sidebar

### Responsive Testing

- [ ] **Desktop (1280px+)**: Full sidebar, resizable panels
- [ ] **Laptop (1024px)**: Sidebar collapsible, panels work
- [ ] **Tablet (768px)**: Drawer navigation, panels auto-hide
- [ ] **Mobile (< 768px)**: Drawer navigation, stacked layouts

### Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (important for iPad users)
- [ ] Edge (latest)

## Files to Create

- `components/ui/ResizablePanel.tsx` - Reusable resizable panel
- `hooks/useBreakpoint.ts` - Responsive breakpoint detection
- `hooks/useKeyboardShortcuts.ts` - Keyboard shortcut handling (optional)

## Files to Modify

- `App.tsx` - Add layout state to context, update AppLayout
- `components/Navigation.tsx` - Add collapse toggle, animations
- `components/PracticeRoom.tsx` - Add ResizablePanel, toggle button
- `components/SongDetail.tsx` - Consider adding collapsible AI sidebar (optional)

## Acceptance Criteria

1. ✅ Sidebar has visible collapse/expand toggle button
2. ✅ Sidebar collapse state persists across sessions
3. ✅ Mobile users see drawer navigation with overlay
4. ✅ PracticeRoom song list is resizable with drag handle
5. ✅ Panel widths persist across sessions
6. ✅ Smooth 300ms animations on all transitions
7. ✅ No layout shift or content cutoff on resize
8. ✅ Works on desktop, laptop, tablet, and mobile

---

**Estimated Lines of Code:** ~300-400 lines across all files
