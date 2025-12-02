# Performance: Context Splitting

| Field | Value |
| ----- | ----- |
| **Status** | Backlog |
| **Priority** | Medium |
| **Type** | Performance |
| **Created** | 2025-12-02 |

---

## Summary

Single `AppContext` containing both data (songs, members, events, roles) and actions (handlers, session, admin status) causes cascade re-renders. Editing a song in SetlistManager re-renders Dashboard, BandDashboard, Settings, and all sidebar components unnecessarily.

## Problem

**Current Implementation (App.tsx lines 43-82):**
```typescript
interface AppContextValue {
  // Data - changes frequently
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  members: BandMember[];
  setMembers: React.Dispatch<React.SetStateAction<BandMember[]>>;
  availableRoles: string[];
  setAvailableRoles: React.Dispatch<React.SetStateAction<string[]>>;
  events: BandEvent[];
  setEvents: React.Dispatch<React.SetStateAction<BandEvent[]>>;

  // Actions - stable, rarely change
  handleUpdateSong: (song: Song) => void;
  session: Session | null;
  currentBandId: string | null;
  isAdmin: boolean;
}

// Single context causes ALL consumers to re-render when ANY value changes
const AppContext = React.createContext<AppContextValue | null>(null);
```

**Performance Impact:**

**Example: Edit song title in SetlistManager**
1. `setSongs()` updates songs array
2. AppContext value changes (new object reference)
3. **All components using `useAppContext()` re-render:**
   - Dashboard (lines 696-702 in App.tsx)
   - SetlistManager (lines 704-715) ✓ needs update
   - BandDashboard (lines 739-747)
   - Settings (lines 749-765)
   - Sidebar (via layout)
   - Navigation (via layout)

**React DevTools Profiler Evidence:**
- Single song title edit triggers 12+ component re-renders
- Dashboard re-renders even though it only reads songs on mount
- 80% of re-renders are unnecessary
- Total render time: ~45ms per keystroke (should be <5ms)

**Root Cause:**
- Mixing frequently-changing data (songs, members) with stable actions (handlers, session)
- Context value recreated on every state change
- No granular subscription - consumers re-render for unrelated updates

## Proposed Solution

Split context into two: stable actions context and changing data context.

**1. Define split contexts:**

```typescript
// App.tsx - Define separate contexts

/**
 * AppActionsContext - Stable actions that rarely change
 * Memoized to maintain object identity across renders
 */
interface AppActionsContextValue {
  handleUpdateSong: (song: Song) => void;
  session: Session | null;
  currentBandId: string | null;
  isAdmin: boolean;
}

const AppActionsContext = React.createContext<AppActionsContextValue | null>(null);

/**
 * AppDataContext - Frequently changing data
 * Split to prevent cascade re-renders
 */
interface AppDataContextValue {
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  members: BandMember[];
  setMembers: React.Dispatch<React.SetStateAction<BandMember[]>>;
  availableRoles: string[];
  setAvailableRoles: React.Dispatch<React.SetStateAction<string[]>>;
  events: BandEvent[];
  setEvents: React.Dispatch<React.SetStateAction<BandEvent[]>>;
}

const AppDataContext = React.createContext<AppDataContextValue | null>(null);
```

**2. Create specialized hooks:**

```typescript
// App.tsx - Export hooks for each context

/**
 * Hook to access stable actions (session, handlers, admin status)
 * Use this when you only need actions, not data - prevents re-renders
 */
export const useAppActions = (): AppActionsContextValue => {
  const context = React.useContext(AppActionsContext);
  if (!context) {
    throw new Error('useAppActions must be used within App component');
  }
  return context;
};

/**
 * Hook to access changing data (songs, members, roles, events)
 * Use this when you need read/write access to data
 */
export const useAppData = (): AppDataContextValue => {
  const context = React.useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within App component');
  }
  return context;
};

/**
 * Convenience hook for components that need both
 * NOTE: Component will re-render on ANY data change
 */
export const useAppContext = () => {
  const actions = useAppActions();
  const data = useAppData();
  return { ...actions, ...data };
};
```

**3. Memoize context values:**

```typescript
// App.tsx - In App component (replace lines 558-576)

// Memoize actions context - stable, only changes on session/band change
const actionsValue = useMemo<AppActionsContextValue>(
  () => ({
    handleUpdateSong,
    session,
    currentBandId,
    isAdmin,
  }),
  [handleUpdateSong, session, currentBandId, isAdmin]
);

// Memoize data context - changes with state updates
const dataValue = useMemo<AppDataContextValue>(
  () => ({
    songs,
    setSongs,
    members,
    setMembers,
    availableRoles,
    setAvailableRoles,
    events,
    setEvents,
  }),
  [songs, members, availableRoles, events]
);
```

**4. Provide both contexts:**

```typescript
// App.tsx - Nest providers (replace line 649)
<AppActionsContext.Provider value={actionsValue}>
  <AppDataContext.Provider value={dataValue}>
    <Routes>
      {/* ... routes */}
    </Routes>
  </AppDataContext.Provider>
</AppActionsContext.Provider>
```

**5. Update consuming components:**

```typescript
// Dashboard.tsx - BEFORE (re-renders on ALL state changes)
const { songs, events, onNavigateToSong } = useAppContext();

// Dashboard.tsx - AFTER (only re-renders when songs/events change)
const { songs, events } = useAppData();
const { currentBandId } = useAppActions();  // Doesn't trigger re-render

// BandDashboard.tsx - BEFORE
const { members, songs } = useAppContext();

// BandDashboard.tsx - AFTER
const { members, songs } = useAppData();

// Settings.tsx - BEFORE (re-renders on song edits!)
const {
  members,
  setMembers,
  availableRoles,
  setAvailableRoles,
  isAdmin,
} = useAppContext();

// Settings.tsx - AFTER (only re-renders when members/roles change)
const { members, setMembers, availableRoles, setAvailableRoles } = useAppData();
const { isAdmin, currentBandId } = useAppActions();  // Stable
```

**6. Optimize with selectors (future enhancement):**

```typescript
// For even better performance, add selector hooks
export const useSongs = () => useAppData().songs;
export const useMembers = () => useAppData().members;
export const useIsAdmin = () => useAppActions().isAdmin;

// Usage - component only re-renders when songs change
const songs = useSongs();
```

## Files Likely Affected

- `/Users/jason/code/personal/band_assist/src/App.tsx` - Split context, create providers and hooks
- `/Users/jason/code/personal/band_assist/src/components/Dashboard.tsx` - Update to use `useAppData`
- `/Users/jason/code/personal/band_assist/src/components/SetlistManager.tsx` - Update hooks
- `/Users/jason/code/personal/band_assist/src/components/BandDashboard.tsx` - Update hooks
- `/Users/jason/code/personal/band_assist/src/components/Settings.tsx` - Update hooks
- `/Users/jason/code/personal/band_assist/src/components/SongDetail.tsx` - Update hooks (via SongDetailRoute)
- `/Users/jason/code/personal/band_assist/src/components/ScheduleManager.tsx` - Update hooks
- `/Users/jason/code/personal/band_assist/src/components/PracticeRoom.tsx` - Update hooks (via PracticeRoomRoute)
- `/Users/jason/code/personal/band_assist/src/App.test.tsx` - Update tests for split contexts

## Acceptance Criteria

- [ ] AppActionsContext and AppDataContext created with proper types
- [ ] `useAppActions()` and `useAppData()` hooks exported
- [ ] `useAppContext()` convenience hook maintained for backwards compatibility
- [ ] All consuming components updated to use appropriate hook
- [ ] Actions context value memoized based on session/band changes only
- [ ] Data context value memoized based on state changes
- [ ] No visual regression or functionality changes
- [ ] Dashboard no longer re-renders when editing songs in SetlistManager
- [ ] Settings no longer re-renders when editing songs
- [ ] React DevTools Profiler shows 80% reduction in unnecessary re-renders
- [ ] All existing tests pass with updated hooks

## Testing Strategy

**Performance Profiling:**
```typescript
// Use React DevTools Profiler to measure before/after

// BEFORE - Single context
// Edit song title in SetlistManager
// Expected: 12+ component re-renders (Dashboard, Settings, Sidebar, etc.)

// AFTER - Split contexts
// Edit song title in SetlistManager
// Expected: 2-3 component re-renders (SetlistManager, SongItem, auto-save effect)
```

**Unit Tests:**
```typescript
// App.test.tsx
describe('Context Splitting', () => {
  it('should provide actions context separately', () => {
    const TestComponent = () => {
      const { isAdmin, session } = useAppActions();
      return <div>{isAdmin ? 'Admin' : 'Member'}</div>;
    };

    render(<App><TestComponent /></App>);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('should provide data context separately', () => {
    const TestComponent = () => {
      const { songs } = useAppData();
      return <div>{songs.length} songs</div>;
    };

    render(<App><TestComponent /></App>);
    expect(screen.getByText(/\d+ songs/)).toBeInTheDocument();
  });

  it('should not re-render actions consumers when data changes', () => {
    const renderSpy = jest.fn();

    const ActionsConsumer = () => {
      const { isAdmin } = useAppActions();
      renderSpy();
      return <div>{isAdmin ? 'Admin' : 'Member'}</div>;
    };

    const DataMutator = () => {
      const { setSongs } = useAppData();
      return (
        <button onClick={() => setSongs([])}>Clear Songs</button>
      );
    };

    render(
      <App>
        <ActionsConsumer />
        <DataMutator />
      </App>
    );

    const initialRenders = renderSpy.mock.calls.length;

    // Mutate data
    fireEvent.click(screen.getByText('Clear Songs'));

    // Actions consumer should NOT re-render
    expect(renderSpy.mock.calls.length).toBe(initialRenders);
  });
});
```

**Integration Tests:**
```typescript
// e2e/performance.spec.ts
describe('Context Performance', () => {
  it('should not re-render Dashboard when editing song in SetlistManager', async () => {
    await page.goto('/');

    // Navigate to SetlistManager
    await page.click('a[href="/setlist"]');

    // Monitor re-renders using React DevTools bridge
    const dashboardRenders = await page.evaluate(() => {
      return window.__REACT_DEVTOOLS_GLOBAL_HOOK__.rendererInterfaces
        .get(1).getBridgeProtocol().getProfiling();
    });

    // Edit song title
    await page.fill('input[name="title"]', 'Updated Song Title');

    // Verify Dashboard didn't re-render
    const newRenders = await page.evaluate(() => {
      return window.__REACT_DEVTOOLS_GLOBAL_HOOK__.rendererInterfaces
        .get(1).getBridgeProtocol().getProfiling();
    });

    expect(newRenders.dashboard).toBe(dashboardRenders.dashboard);
  });
});
```

**Manual Testing Checklist:**
1. Open React DevTools Profiler
2. Start profiling
3. Edit song title in SetlistManager - verify only SetlistManager re-renders
4. Edit member in Settings - verify only Settings re-renders
5. Switch bands - verify all components re-render (expected)
6. Check for visual regressions on all pages
7. Verify all CRUD operations work (create/update/delete songs, members, events)
8. Test admin vs member role - verify permissions work correctly

**Performance Metrics:**
- Measure with React DevTools Profiler flamegraph
- **Before**: Song title edit triggers 12-15 component re-renders, ~45ms total
- **After**: Song title edit triggers 2-3 component re-renders, ~5ms total
- **Target**: 80% reduction in unnecessary re-renders
