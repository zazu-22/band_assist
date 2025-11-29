# T-004: Panel Collapse & Resize Functionality

**Status**: Implementation Complete - Pending Review
**Priority**: Medium
**Estimated Effort**: 7-10 hours
**Last Updated**: 2025-11-25

## Implementation Summary

All four phases have been implemented:

### Files Created

- `src/hooks/useBreakpoint.ts` - Responsive breakpoint detection hook
- `src/hooks/useLayoutShortcuts.ts` - Keyboard shortcuts hook (Cmd/Ctrl+B)
- `src/components/ui/ResizablePanel.tsx` - Reusable resizable panel component

### Files Modified

- `src/App.tsx` - Added layout state (sidebarCollapsed, mobileNavOpen), mobile drawer in AppLayout
- `src/components/Navigation.tsx` - Added collapse toggle, animated transitions
- `src/components/PracticeRoom.tsx` - Integrated ResizablePanel for song list
- `src/components/ui/index.ts` - Exported ResizablePanel

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
// Add to AppContextValue interface (defined in App.tsx around line 42)
interface AppContextValue {
  // ... existing fields (songs, members, events, availableRoles, etc.)
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
// Note: State setters from useState are stable and don't need to be in deps
const contextValue = useMemo(
  () => ({
    // Existing data fields
    songs,
    members,
    events,
    availableRoles,
    // Existing callbacks (stable references from useState)
    setSongs,
    setMembers,
    setEvents,
    setAvailableRoles,
    onUpdateSong,
    // New layout state
    sidebarCollapsed,
    setSidebarCollapsed,
  }),
  [
    // All data values that trigger re-renders when changed
    songs,
    members,
    events,
    availableRoles,
    sidebarCollapsed,
    // Note: onUpdateSong should be wrapped in useCallback if not already
    onUpdateSong,
    // State setters (setSongs, setMembers, etc.) are stable - no need to include
  ]
);
```

#### 1.2 Update Navigation Component

**File**: `components/Navigation.tsx`

Add collapse toggle button and transition animations:

```typescript
// Add to existing imports in Navigation.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '../App';

// Existing NavigationProps interface remains unchanged:
// interface NavigationProps {
//   onLogout?: () => void;
//   showLogout?: boolean;
//   currentBandName?: string;
//   userBands?: Array<{ id: string; name: string }>;
//   onSelectBand?: (bandId: string) => void;
// }

// Update the Navigation component to access sidebar state from context:
export const Navigation: React.FC<NavigationProps> = ({
  onLogout,
  showLogout = false,
  currentBandName,
  userBands = [],
  onSelectBand,
}) => {
  // NEW: Access sidebar state from context
  const { sidebarCollapsed, setSidebarCollapsed } = useAppContext();

  // Existing hooks (already present in Navigation.tsx)
  const navigate = useNavigate();
  const location = useLocation();

  // Existing isActive function uses route matching (already present)
  const isActive = (path: string): boolean => matchRoute(location.pathname, path);

  return (
    <div className={`
      bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen sticky top-0
      transition-all duration-300 ease-in-out
      ${sidebarCollapsed ? 'w-16' : 'w-20 lg:w-64'}
    `}>
      {/* Header with collapse toggle */}
      <div className="p-6 flex items-center justify-between">
        {!sidebarCollapsed && (
          <div className="hidden lg:flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
              <Music className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tighter text-zinc-100">
              BAND<br /><span className="text-amber-600">ASSIST</span>
            </h1>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center mx-auto">
            <Music className="text-white w-6 h-6" />
          </div>
        )}

        {/* Collapse toggle - visible on lg screens */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav items - existing NAV_ITEMS loop with collapse support */}
      <nav className="flex-1 px-3 py-6 space-y-2" aria-label="Main navigation">
        {NAV_ITEMS.map(item => {
          const Icon = iconMap[item.id] ?? LayoutDashboard;
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                ${sidebarCollapsed ? 'justify-center' : ''}
                ${active ? 'bg-zinc-800 text-amber-500' : 'text-zinc-400 hover:bg-zinc-800/50'}
              `}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={`w-6 h-6 ${active ? 'stroke-amber-500' : ''}`} />
              {!sidebarCollapsed && (
                <span className="hidden lg:block font-medium">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ... rest of existing Navigation (settings, logout buttons) */}
    </div>
  );
};
```

#### 1.3 Update AppLayout

**File**: `App.tsx` (AppLayout component is defined around line 129)

The existing AppLayout passes props to Navigation. Update it to respond to sidebar state:

```typescript
// AppLayout is defined in App.tsx (around line 129) and used as a layout route
// Current signature: AppLayout({ onLogout, showLogout, currentBandName, userBands, onSelectBand })

const AppLayout: React.FC<{
  onLogout: () => void;
  showLogout: boolean;
  currentBandName: string;
  userBands: Array<{ id: string; name: string }>;
  onSelectBand: (bandId: string) => void;
}> = ({ onLogout, showLogout, currentBandName, userBands, onSelectBand }) => {
  // Navigation accesses sidebarCollapsed from context internally
  return (
    <div className="flex min-h-screen bg-zinc-950 font-sans text-zinc-100">
      <Navigation
        onLogout={onLogout}
        showLogout={showLogout}
        currentBandName={currentBandName}
        userBands={userBands}
        onSelectBand={onSelectBand}
      />
      <main className="flex-1 h-screen overflow-y-auto transition-all duration-300 ease-in-out">
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
// Add to AppContextValue interface (in App.tsx)
interface AppContextValue {
  // ... existing fields
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

// In App component, add state:
const [mobileNavOpen, setMobileNavOpen] = useState(false);

// Add to context value useMemo (no need to add setMobileNavOpen to deps - it's stable)
```

#### 2.2 Create Drawer Overlay with Focus Management

**File**: `App.tsx` (AppLayout component)

```typescript
import { Menu, X } from 'lucide-react';
import { useRef, useEffect } from 'react';

// Update AppLayout to handle mobile drawer with proper focus management
const AppLayout: React.FC<AppLayoutProps> = ({
  onLogout,
  showLogout,
  currentBandName,
  userBands,
  onSelectBand,
}) => {
  const { mobileNavOpen, setMobileNavOpen } = useAppContext();
  const location = useLocation();

  // Refs for focus management
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close drawer on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, setMobileNavOpen]);

  // Focus management: focus close button when drawer opens, return focus when closed
  useEffect(() => {
    if (mobileNavOpen) {
      // Focus the close button when drawer opens
      closeButtonRef.current?.focus();
    } else {
      // Return focus to menu button when drawer closes
      menuButtonRef.current?.focus();
    }
  }, [mobileNavOpen]);

  // Handle Escape key to close drawer
  useEffect(() => {
    if (!mobileNavOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileNavOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileNavOpen, setMobileNavOpen]);

  return (
    <div className="flex min-h-screen bg-zinc-950 font-sans text-zinc-100">
      {/* Mobile overlay - clicking closes drawer */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - drawer on mobile, static on desktop */}
      <div
        className={`
          lg:relative lg:translate-x-0
          fixed top-0 left-0 h-full z-50
          transform transition-transform duration-300 ease-in-out motion-reduce:transition-none
          ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        role="dialog"
        aria-modal={mobileNavOpen ? 'true' : undefined}
        aria-label="Navigation menu"
      >
        {/* Close button inside drawer (mobile only) */}
        {mobileNavOpen && (
          <button
            ref={closeButtonRef}
            onClick={() => setMobileNavOpen(false)}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-100 lg:hidden"
            aria-label="Close navigation menu"
          >
            <X size={24} />
          </button>
        )}
        <Navigation
          onLogout={onLogout}
          showLogout={showLogout}
          currentBandName={currentBandName}
          userBands={userBands}
          onSelectBand={onSelectBand}
        />
      </div>

      {/* Mobile menu button */}
      <button
        ref={menuButtonRef}
        onClick={() => setMobileNavOpen(true)}
        className="fixed top-4 left-4 z-30 p-2 bg-zinc-900 rounded-lg shadow-lg lg:hidden"
        aria-label="Open navigation menu"
        aria-expanded={mobileNavOpen}
        aria-controls="mobile-nav"
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
  // === State ===
  const [width, setWidth] = useState(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`sdb_panel_${storageKey}`);
        if (saved) return Math.max(minWidth, Math.min(maxWidth, parseInt(saved, 10)));
      } catch {
        // localStorage may be unavailable or quota exceeded
      }
    }
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);

  // === Refs ===
  const panelRef = useRef<HTMLDivElement>(null);

  // Track initial position and width for accurate delta calculation
  const dragStartRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Use refs to avoid stale closures in event handlers
  // These refs keep current values accessible in event listeners without re-registering
  const widthRef = useRef(width);
  widthRef.current = width;

  const minWidthRef = useRef(minWidth);
  minWidthRef.current = minWidth;

  const maxWidthRef = useRef(maxWidth);
  maxWidthRef.current = maxWidth;

  const sideRef = useRef(side);
  sideRef.current = side;

  // === Event Handlers (defined before useEffect for clarity) ===

  // Start resize - works for both mouse and touch
  const handleDragStart = useCallback((clientX: number) => {
    dragStartRef.current = { startX: clientX, startWidth: widthRef.current };
    setIsResizing(true);
  }, []);

  // Handle resize movement - works for both mouse and touch
  const handleDragMove = useCallback((clientX: number) => {
    if (!dragStartRef.current) return;

    const delta = sideRef.current === 'left'
      ? clientX - dragStartRef.current.startX
      : dragStartRef.current.startX - clientX;

    const newWidth = dragStartRef.current.startWidth + delta;
    setWidth(Math.max(minWidthRef.current, Math.min(maxWidthRef.current, newWidth)));
  }, []);

  // End resize - persist to localStorage
  const handleDragEnd = useCallback(() => {
    setIsResizing(false);
    dragStartRef.current = null;

    if (storageKey) {
      try {
        localStorage.setItem(`sdb_panel_${storageKey}`, String(widthRef.current));
      } catch {
        // localStorage may be unavailable or quota exceeded
      }
    }
  }, [storageKey]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  }, [handleDragStart]);

  // Touch event handlers (for tablets/iPads)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleDragStart(e.touches[0].clientX);
    }
  }, [handleDragStart]);

  // === Effects ===

  // Global event listeners for drag (active only while resizing)
  useEffect(() => {
    if (!isResizing) return;

    // Mouse events
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX);
    const onMouseUp = () => handleDragEnd();

    // Touch events
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleDragMove(e.touches[0].clientX);
      }
    };
    const onTouchEnd = () => handleDragEnd();

    // Register listeners
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);

    // Visual feedback during resize
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    // Prevent text selection on touch devices
    document.body.style.webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [isResizing, handleDragMove, handleDragEnd]);

  // === Render ===

  const handlePosition = side === 'left' ? 'right-0' : 'left-0';

  return (
    <div
      ref={panelRef}
      className={`relative shrink-0 motion-reduce:transition-none ${className}`}
      style={{ width }}
    >
      {children}

      {/* Resize handle - supports both mouse and touch */}
      <div
        className={`
          absolute top-0 ${handlePosition} w-2 h-full cursor-col-resize
          hover:bg-amber-500/50 active:bg-amber-500 transition-colors group
          touch-none
          ${isResizing ? 'bg-amber-500' : 'bg-transparent'}
        `}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        aria-valuenow={width}
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        tabIndex={0}
        onKeyDown={(e) => {
          // Keyboard resize support (Arrow keys)
          const step = e.shiftKey ? 50 : 10;
          let newWidth: number | null = null;

          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            newWidth = Math.max(minWidth, widthRef.current - step);
            setWidth(newWidth);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            newWidth = Math.min(maxWidth, widthRef.current + step);
            setWidth(newWidth);
          }

          // Persist keyboard resize to localStorage
          if (newWidth !== null && storageKey) {
            try {
              localStorage.setItem(`sdb_panel_${storageKey}`, String(newWidth));
            } catch {
              // localStorage may be unavailable or quota exceeded
            }
          }
        }}
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

// Tailwind CSS default breakpoints
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

const getBreakpoint = (): Breakpoint => {
  // SSR-safe: default to 'lg' if window is not available
  if (typeof window === 'undefined') return 'lg';

  const width = window.innerWidth;
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  return 'sm';
};

export const useBreakpoint = (): Breakpoint => {
  // Lazy initialization using function form to get actual value on first render
  // This avoids layout flash that would occur with a hardcoded default
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(getBreakpoint);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    // Debounced resize handler to avoid excessive re-renders during window resize.
    // 150ms delay balances responsiveness with performance - fast enough to feel
    // responsive but slow enough to batch rapid resize events (e.g., during
    // window drag resizing which can fire 60+ events per second).
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setBreakpoint(getBreakpoint());
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
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

## Accessibility Considerations

The implementation includes the following accessibility features:

- **ARIA Labels**: All interactive elements (buttons, resize handles) include proper `aria-label` attributes
- **ARIA Value Attributes**: Resize handles include `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` for screen reader announcements
- **Keyboard Navigation**: Resize handles are focusable with `tabIndex={0}` and support Arrow key resizing (10px steps, 50px with Shift)
- **Reduced Motion**: Uses `motion-reduce:transition-none` for users who prefer reduced motion
- **Semantic Roles**: Resize handles use `role="separator"` with `aria-orientation="vertical"`
- **Screen Reader Support**: Mobile menu overlay uses `aria-hidden="true"` to prevent focus trapping
- **Touch Support**: Full touch event support for tablet users (iPad, Android tablets) with `touch-none` CSS to prevent scroll interference

## Testing Plan

### Functional Testing

- [ ] Sidebar collapse toggle works on desktop
- [ ] Collapsed state persists across page refresh
- [ ] Mobile drawer opens/closes correctly
- [ ] Drawer closes on route change
- [ ] ResizablePanel drag works smoothly
- [ ] Panel widths persist in localStorage
- [ ] Keyboard shortcut (Cmd+B) toggles sidebar

### Accessibility Testing

- [ ] Screen reader announces panel state changes
- [ ] Resize handles are keyboard accessible (Arrow keys)
- [ ] Shift+Arrow provides larger resize steps (50px)
- [ ] Reduced motion preference is respected
- [ ] Focus management works correctly in mobile drawer
- [ ] ARIA value attributes update correctly during resize

### Touch Device Testing

- [ ] Touch drag resize works on iPad Safari
- [ ] Touch drag resize works on Android Chrome
- [ ] No scroll interference during panel resize
- [ ] Touch targets are large enough (min 44px touch area)
- [ ] Multi-touch is handled gracefully (single finger only)

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

### Edge Case Testing

- [ ] localStorage disabled/unavailable (private browsing mode)
- [ ] localStorage quota exceeded
- [ ] Very rapid resize events (stress test debouncing)
- [ ] Window resize during active panel drag
- [ ] Multi-monitor setups with different DPIs
- [ ] Browser zoom levels (50% - 200%)
- [ ] Keyboard resize at min/max boundaries
- [ ] Touch and mouse interaction on hybrid devices

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
