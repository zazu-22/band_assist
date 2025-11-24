# T-004: Panel Collapse & Resize Functionality

**Status**: Ready for Implementation
**Priority**: Medium
**Estimated Effort**: 8-12 hours
**Last Updated**: 2025-11-21

## Overview

Implement collapsible and resizable panels throughout the application to improve space utilization and user control. This includes making the sidebar collapsible, the tab viewer resizable, and ensuring responsive behavior when the browser window is resized. This enhancement addresses the current issue where content gets cut off when the window shrinks.

## Current State

### Existing Layout

**App Structure** (`App.tsx`):

```
┌─────────────────────────────────────────┐
│  Navigation (Left Sidebar - 200px)     │
├─────────────────────────────────────────┤
│  Main Content Area (flex-1)            │
│  - Dashboard / Song Detail / etc.      │
└─────────────────────────────────────────┘
```

**PracticeRoom Layout** (example):

```
┌────────┬────────────────────┬──────────┐
│ Song   │  AlphaTab Viewer   │  (none)  │
│ List   │                    │          │
│ (Left) │    (Center)        │ (Right)  │
└────────┴────────────────────┴──────────┘
```

### Current Limitations

- ❌ Sidebar is fixed width, cannot collapse
- ❌ Tab viewer is not resizable
- ❌ No way to hide song list or other panels
- ❌ Content gets cut off on small screens
- ❌ No responsive breakpoints for mobile/tablet
- ❌ Mixer with `fixed` positioning floats over sidebar when window shrinks
- ❌ Cannot maximize tab viewer for focused practice
- ❌ Layout breaks at narrow widths (< 1024px)

### User Impact

- Wastes screen space when panels aren't needed
- Cannot focus on just the tab viewer
- Difficult to use on smaller screens
- Professional musicians often use tablets/iPads - current layout is desktop-only

## Technical Context

### Current Technology Stack

- **Framework**: React 19.2.0 with TypeScript
- **Styling**: Tailwind CSS (via CDN)
- **State Management**: React useState in App.tsx (no Redux/Zustand)
- **Icons**: Lucide React

### Component Hierarchy

```
App.tsx (root state & layout)
├── Navigation.tsx (sidebar)
│   ├── Dashboard
│   ├── Schedule
│   ├── Band Lineup
│   ├── Setlist Builder
│   ├── Practice Room    ← Most common use case
│   └── LIVE GIG
│
└── renderContent() (switches on currentView)
    ├── Dashboard.tsx
    ├── PracticeRoom.tsx
    │   ├── Song list (left panel)
    │   ├── AlphaTabRenderer (center - tab viewer)
    │   └── (potential right panel for notes/AI)
    ├── SongDetail.tsx
    ├── SetlistBuilder.tsx
    └── ...
```

### Responsive Requirements

**Target Breakpoints**:

- Desktop: 1024px+ (full layout)
- Tablet: 768px-1023px (collapsible sidebar, single panel focus)
- Mobile: < 768px (stack vertically, sidebar as drawer)

**Priority Views** (implement in order):

1. PracticeRoom (most important for tablet use)
2. Song Detail
3. Dashboard
4. Setlist Builder

## Implementation Plan

### Phase 1: Global Sidebar Collapse

#### 1.1 Add Collapse State to App.tsx

```typescript
// In App.tsx, add state:
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

// Pass to Navigation component:
<Navigation
  onNavigate={handleNavigate}
  currentView={currentView}
  collapsed={sidebarCollapsed}
  onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
/>
```

#### 1.2 Update Navigation Component

**File**: `components/Navigation.tsx`

Add collapse button and conditional rendering:

```typescript
interface NavigationProps {
  onNavigate: (view: ViewState) => void;
  currentView: ViewState;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  onNavigate,
  currentView,
  collapsed = false,
  onToggleCollapse
}) => {
  return (
    <nav className={`bg-zinc-900 text-white flex flex-col transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-52'
    }`}>
      {/* Header with collapse toggle */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Music className="text-amber-500" size={24} />
            <div>
              <h1 className="font-bold text-sm">SHARP</h1>
              <h1 className="font-bold text-sm text-amber-500">DRESSED APP</h1>
            </div>
          </div>
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-2 hover:bg-zinc-800 rounded transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        )}
      </div>

      {/* Navigation items */}
      <div className="flex-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800 transition-colors ${
              currentView === item.view ? 'bg-zinc-800 border-l-4 border-amber-500' : ''
            }`}
            title={item.label}
          >
            {item.icon}
            {!collapsed && (
              <span className="text-sm font-medium">{item.label}</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};
```

**New Icons Needed**:

```typescript
import { ChevronLeft, ChevronRight } from 'lucide-react';
```

#### 1.3 Update App.tsx Layout

Adjust main layout to accommodate collapsed sidebar:

```typescript
return (
  <div className="flex h-screen bg-zinc-50 overflow-hidden">
    <Navigation
      onNavigate={handleNavigate}
      currentView={currentView}
      collapsed={sidebarCollapsed}
      onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
    />

    {/* Main content - flex-1 grows to fill remaining space */}
    <main className="flex-1 overflow-hidden">
      {renderContent()}
    </main>
  </div>
);
```

### Phase 2: Resizable Tab Viewer (PracticeRoom)

#### 2.1 Install or Create Resize Handler

**Option A**: Use existing CSS resize

```css
.resizable-panel {
  resize: horizontal;
  overflow: auto;
}
```

**Option B**: Create custom resize handle component

Create new file: `components/ResizablePanel.tsx`

```typescript
import React, { useRef, useState, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

interface ResizablePanelProps {
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  children: React.ReactNode;
  className?: string;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  defaultWidth = 300,
  minWidth = 200,
  maxWidth = 600,
  children,
  className = ''
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (panelRef.current) {
        const newWidth = e.clientX - panelRef.current.getBoundingClientRect().left;
        setWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth]);

  return (
    <div
      ref={panelRef}
      className={`relative ${className}`}
      style={{ width: `${width}px`, flexShrink: 0 }}
    >
      {children}

      {/* Resize handle */}
      <div
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-amber-500 transition-colors ${
          isResizing ? 'bg-amber-500' : 'bg-zinc-300'
        }`}
        onMouseDown={() => setIsResizing(true)}
      >
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 bg-zinc-200 rounded p-1 opacity-0 hover:opacity-100 transition-opacity">
          <GripVertical size={16} className="text-zinc-600" />
        </div>
      </div>
    </div>
  );
};
```

#### 2.2 Update PracticeRoom Layout

**File**: `components/PracticeRoom.tsx`

Wrap song list in resizable panel:

```typescript
import { ResizablePanel } from './ResizablePanel';

export const PracticeRoom: React.FC<PracticeRoomProps> = ({ ... }) => {
  const [showSongList, setShowSongList] = useState(true);

  return (
    <div className="flex h-full">
      {/* Collapsible Song List */}
      {showSongList && (
        <ResizablePanel
          defaultWidth={280}
          minWidth={200}
          maxWidth={500}
          className="bg-zinc-900 text-white flex flex-col"
        >
          {/* Existing song list content */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="font-bold">Songs</h2>
            <button
              onClick={() => setShowSongList(false)}
              className="p-1 hover:bg-zinc-800 rounded"
              title="Hide song list"
            >
              <PanelLeftClose size={16} />
            </button>
          </div>
          {/* Song list items... */}
        </ResizablePanel>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Show song list button when hidden */}
        {!showSongList && (
          <button
            onClick={() => setShowSongList(true)}
            className="absolute top-4 left-4 z-10 p-2 bg-zinc-900 text-white rounded-lg shadow-lg hover:bg-zinc-800"
            title="Show song list"
          >
            <PanelLeftOpen size={20} />
          </button>
        )}

        {/* AlphaTab viewer and controls */}
        {selectedSong ? (
          <AlphaTabRenderer /* ... */ />
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-400">
            Select a song to practice
          </div>
        )}
      </div>
    </div>
  );
};
```

**New Icons**:

```typescript
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
```

### Phase 3: Responsive Breakpoints

#### 3.1 Add Responsive Utilities Hook

Create: `hooks/useBreakpoint.ts`

```typescript
import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export const useBreakpoint = (): Breakpoint => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setBreakpoint('mobile');
      } else if (width < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
};
```

#### 3.2 Apply Responsive Logic

**In PracticeRoom.tsx**:

```typescript
import { useBreakpoint } from '../hooks/useBreakpoint';

export const PracticeRoom: React.FC<PracticeRoomProps> = ({ ... }) => {
  const breakpoint = useBreakpoint();
  const [showSongList, setShowSongList] = useState(breakpoint === 'desktop');

  // Auto-hide song list on mobile/tablet
  useEffect(() => {
    if (breakpoint !== 'desktop' && selectedSong) {
      setShowSongList(false);
    }
  }, [breakpoint, selectedSong]);

  return (
    <div className={`flex h-full ${breakpoint === 'mobile' ? 'flex-col' : ''}`}>
      {/* Responsive layout */}
    </div>
  );
};
```

#### 3.3 Mobile Drawer for Sidebar

**In App.tsx**:

```typescript
import { useBreakpoint } from './hooks/useBreakpoint';

const App: React.FC = () => {
  const breakpoint = useBreakpoint();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (breakpoint === 'mobile') {
      setSidebarCollapsed(true);
    }
  }, [breakpoint]);

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      {/* Mobile: Overlay drawer */}
      {breakpoint === 'mobile' && mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${
        breakpoint === 'mobile'
          ? `fixed top-0 left-0 h-full z-50 transition-transform ${
              mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : ''
      }`}>
        <Navigation /* ... */ />
      </div>

      {/* Mobile menu button */}
      {breakpoint === 'mobile' && (
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="fixed top-4 left-4 z-30 p-2 bg-zinc-900 text-white rounded-lg shadow-lg"
        >
          <Menu size={24} />
        </button>
      )}

      <main className="flex-1 overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};
```

### Phase 4: Persist Panel States

#### 4.1 Save to localStorage

Add helper functions:

```typescript
// utils/panelState.ts
const PANEL_STATE_KEY = 'sdb_panel_states';

interface PanelState {
  sidebarCollapsed: boolean;
  songListWidth: number;
  songListVisible: boolean;
}

export const savePanelState = (state: Partial<PanelState>) => {
  const current = loadPanelState();
  localStorage.setItem(PANEL_STATE_KEY, JSON.stringify({ ...current, ...state }));
};

export const loadPanelState = (): PanelState => {
  try {
    const saved = localStorage.getItem(PANEL_STATE_KEY);
    return saved
      ? JSON.parse(saved)
      : {
          sidebarCollapsed: false,
          songListWidth: 280,
          songListVisible: true,
        };
  } catch {
    return {
      sidebarCollapsed: false,
      songListWidth: 280,
      songListVisible: true,
    };
  }
};
```

#### 4.2 Apply on Mount

```typescript
// In App.tsx
const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
  return loadPanelState().sidebarCollapsed;
});

// Save when changed
useEffect(() => {
  savePanelState({ sidebarCollapsed });
}, [sidebarCollapsed]);
```

## UI/UX Patterns

### Visual Indicators

1. **Resize Handles**: Vertical grip icon, highlight on hover
2. **Collapse Buttons**: Chevron icons that rotate to indicate direction
3. **Panel Transitions**: Smooth 300ms animations
4. **Focus States**: Highlight active panel with subtle border

### Keyboard Shortcuts (Optional Enhancement)

- `Cmd/Ctrl + B` - Toggle sidebar
- `Cmd/Ctrl + L` - Toggle song list
- `F11` - Toggle fullscreen mode

## Testing Plan

### Functional Testing

- [ ] Sidebar collapses/expands smoothly
- [ ] Song list panel is resizable
- [ ] Song list can be hidden/shown
- [ ] Panel states persist across sessions
- [ ] Responsive breakpoints trigger correctly
- [ ] Mobile drawer opens/closes properly

### Responsive Testing

- [ ] Desktop (1920x1080): Full layout works
- [ ] Laptop (1366x768): All panels visible and functional
- [ ] Tablet landscape (1024x768): Sidebar collapses, panels work
- [ ] Tablet portrait (768x1024): Song list auto-hides
- [ ] Mobile (375x667): Drawer navigation works

### Cross-Browser Testing

- [ ] Chrome
- [ ] Firefox
- [ ] Safari (important for iPad musicians)
- [ ] Edge

### Performance Testing

- [ ] No lag during resize
- [ ] Transitions are smooth (60fps)
- [ ] No layout shift issues
- [ ] localStorage doesn't grow unbounded

## Known Issues & Limitations

1. **AlphaTab Rendering**: AlphaTab may need to recalculate layout when container resizes. May need to call `api.updateSettings()` or trigger re-render.

2. **Touch Devices**: Resize handles may be difficult on touch screens. Consider larger hit areas or alternative UI for tablets.

3. **Very Small Screens**: On screens < 375px width, layout may still have issues. These are outside target use cases.

4. **localStorage Limits**: Storing panel states in localStorage is fine, but don't store large data here (songs, etc.)

## Future Enhancements

- **Preset Layouts**: "Focus Mode", "Practice Mode", "Overview Mode"
- **Drag-and-Drop Panels**: Rearrange panel positions
- **Multi-Monitor Support**: Remember panel states per monitor
- **Panel Opacity**: Overlay panels with transparency
- **Split View**: Show two songs side by side

## Resources

### React Resize Libraries (if custom is too complex)

- `react-resizable-panels`: <https://github.com/bvaughn/react-resizable-panels>
- `react-split`: <https://github.com/nathancahill/split/tree/master/packages/react-split>
- `re-resizable`: <https://github.com/bokuweb/re-resizable>

### Tailwind Responsive Design

- Breakpoints: <https://tailwindcss.com/docs/responsive-design>
- Flexbox: <https://tailwindcss.com/docs/flex>
- Grid: <https://tailwindcss.com/docs/grid-template-columns>

## Acceptance Criteria

1. ✅ Sidebar can collapse to icon-only view
2. ✅ Song list panel is resizable with visual handle
3. ✅ Song list can be hidden/shown
4. ✅ Panel states persist across sessions
5. ✅ Responsive breakpoints work on mobile/tablet
6. ✅ No content cutoff on window resize
7. ✅ Smooth animations for all panel transitions
8. ✅ AlphaTab viewer remains functional when resized
9. ✅ All testing checklist items pass
10. ✅ Works on target devices (desktop, laptop, iPad)

---

**Files to Create:**

- `components/ResizablePanel.tsx` - Reusable resize component
- `hooks/useBreakpoint.ts` - Responsive breakpoint hook
- `utils/panelState.ts` - localStorage persistence

**Files to Modify:**

- `App.tsx` - Add sidebar collapse state
- `components/Navigation.tsx` - Add collapse button and conditional rendering
- `components/PracticeRoom.tsx` - Add resizable song list panel
- Possibly: `components/SongDetail.tsx`, `components/Dashboard.tsx` for consistency

**Estimated Lines of Code:** ~400-500 lines across all files
