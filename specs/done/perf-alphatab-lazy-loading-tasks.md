# Task Breakdown: AlphaTab Lazy Loading Performance Optimization

Generated: 2025-12-02
Source: specs/perf-alphatab-lazy-loading.md

## Overview

This task breakdown implements lazy loading for the AlphaTabRenderer component to reduce initial bundle size by ~37% and improve Dashboard First Contentful Paint (FCP) by ~42%. The implementation creates a LazyAlphaTab wrapper component with Suspense fallback and updates all consuming components (SongDetail, PracticeRoom, PerformanceMode) to use the lazy-loaded version.

## Phase 1: Foundation

### Task 1.1: Create LazyAlphaTab wrapper component

**Description**: Create a new lazy-loaded wrapper component for AlphaTabRenderer with Suspense fallback
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: None (foundation task)

**Technical Requirements**:
- Create new file at `src/components/LazyAlphaTab.tsx`
- Use React.lazy() to dynamically import AlphaTabRenderer
- Wrap in Suspense with loading fallback
- Re-export AlphaTabRendererProps type for consumer convenience
- Re-export AlphaTabHandle and TrackInfo types
- Loading state should display centered spinner with descriptive message

**Implementation**:

```typescript
// src/components/LazyAlphaTab.tsx
import React, { Suspense, lazy, forwardRef } from 'react';
import { LoadingSpinner } from './ui';

// Re-export types for convenience
export type {
  AlphaTabHandle,
  TrackInfo,
} from './AlphaTabRenderer';

// Import props type for typing the component
import type { AlphaTabHandle } from './AlphaTabRenderer';

// Note: AlphaTabRendererProps is not exported, so we define our own based on the interface
// These match the interface in AlphaTabRenderer.tsx lines 289-319
interface AlphaTabRendererProps {
  fileData: string;
  isPlaying?: boolean;
  onPlaybackChange?: (isPlaying: boolean) => void;
  onReady?: (handle: AlphaTabHandle) => void;
  readOnly?: boolean;
  showControls?: boolean;
  showProgressBar?: boolean;
  onStateChange?: (state: import('@/components/practice/types').AlphaTabState) => void;
  onPositionChange?: (current: number, total: number) => void;
  onTracksLoaded?: (tracks: import('./AlphaTabRenderer').TrackInfo[]) => void;
  onError?: (error: string) => void;
  additionalMidiFilters?: number[];
}

// Lazy load the heavy AlphaTabRenderer (~1MB with worker, fonts, soundfont)
const AlphaTabRenderer = lazy(() =>
  import('./AlphaTabRenderer').then(module => ({
    default: module.AlphaTabRenderer,
  }))
);

/**
 * Lazy-loaded wrapper for AlphaTabRenderer.
 *
 * Defers loading of the 1MB+ AlphaTab library until actually needed,
 * improving initial bundle size by ~37% and Dashboard FCP by ~42%.
 *
 * Usage:
 * - Use this component instead of direct AlphaTabRenderer import
 * - Displays loading spinner while AlphaTab bundle loads
 * - All props are passed through to the underlying AlphaTabRenderer
 */
export const LazyAlphaTab: React.FC<AlphaTabRendererProps> = (props) => {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-zinc-500 font-medium">
              Loading guitar tab renderer...
            </p>
          </div>
        </div>
      }
    >
      <AlphaTabRenderer {...props} />
    </Suspense>
  );
};

LazyAlphaTab.displayName = 'LazyAlphaTab';
```

**Acceptance Criteria**:
- [ ] LazyAlphaTab component created at `src/components/LazyAlphaTab.tsx`
- [ ] Component uses React.lazy() for dynamic import
- [ ] Suspense fallback displays LoadingSpinner with message
- [ ] AlphaTabHandle and TrackInfo types are re-exported
- [ ] Component has displayName set for React DevTools
- [ ] Props interface matches AlphaTabRendererProps exactly
- [ ] All props are passed through to AlphaTabRenderer

---

## Phase 2: Consumer Updates

### Task 2.1: Update SongDetail to use LazyAlphaTab

**Description**: Replace direct AlphaTabRenderer import with LazyAlphaTab in SongDetail component
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 2.2, Task 2.3

**Technical Requirements**:
- Update import statement at line 46 of SongDetail.tsx
- Replace `AlphaTabRenderer` with `LazyAlphaTab` in JSX (line 778)
- No other changes required - props remain identical

**Current Code** (src/components/SongDetail.tsx line 46):
```typescript
import { AlphaTabRenderer } from './AlphaTabRenderer';
```

**Updated Code**:
```typescript
import { LazyAlphaTab } from './LazyAlphaTab';
```

**Current JSX** (line 778):
```tsx
<AlphaTabRenderer
  fileData={activeChart.storageBase64 || activeChart.url!}
  readOnly={true}
/>
```

**Updated JSX**:
```tsx
<LazyAlphaTab
  fileData={activeChart.storageBase64 || activeChart.url!}
  readOnly={true}
/>
```

**Acceptance Criteria**:
- [ ] Import changed from AlphaTabRenderer to LazyAlphaTab
- [ ] JSX component name changed from AlphaTabRenderer to LazyAlphaTab
- [ ] All existing props remain unchanged
- [ ] TypeScript compiles without errors
- [ ] Guitar tab renders correctly in SongDetail

---

### Task 2.2: Update PracticeRoom to use LazyAlphaTab

**Description**: Replace direct AlphaTabRenderer import with LazyAlphaTab in PracticeRoom component
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 2.1, Task 2.3

**Technical Requirements**:
- Update import statements at lines 24-25 of PracticeRoom.tsx
- Replace `AlphaTabRenderer` with `LazyAlphaTab` in JSX (line 610)
- Update type import to use LazyAlphaTab re-export

**Current Code** (src/components/PracticeRoom.tsx lines 24-25):
```typescript
import { AlphaTabRenderer } from './AlphaTabRenderer';
import type { AlphaTabHandle } from './AlphaTabRenderer';
```

**Updated Code**:
```typescript
import { LazyAlphaTab } from './LazyAlphaTab';
import type { AlphaTabHandle } from './LazyAlphaTab';
```

**Current JSX** (line 610):
```tsx
<AlphaTabRenderer
  fileData={activeChart.storageBase64 || activeChart.url!}
  readOnly={false}
  showControls={false}
  showProgressBar={false}
  onReady={handleAlphaTabReady}
  onStateChange={handleAlphaTabStateChange}
  onPositionChange={handleAlphaTabPositionChange}
  onTracksLoaded={handleAlphaTabTracksLoaded}
/>
```

**Updated JSX**:
```tsx
<LazyAlphaTab
  fileData={activeChart.storageBase64 || activeChart.url!}
  readOnly={false}
  showControls={false}
  showProgressBar={false}
  onReady={handleAlphaTabReady}
  onStateChange={handleAlphaTabStateChange}
  onPositionChange={handleAlphaTabPositionChange}
  onTracksLoaded={handleAlphaTabTracksLoaded}
/>
```

**Acceptance Criteria**:
- [ ] Import changed from AlphaTabRenderer to LazyAlphaTab
- [ ] Type import changed to use LazyAlphaTab re-export
- [ ] JSX component name changed from AlphaTabRenderer to LazyAlphaTab
- [ ] All existing props and callbacks remain unchanged
- [ ] TypeScript compiles without errors
- [ ] Practice room playback controls work correctly
- [ ] Track selection and volume controls function

---

### Task 2.3: Update PerformanceMode to use LazyAlphaTab

**Description**: Replace direct AlphaTabRenderer import with LazyAlphaTab in PerformanceMode component
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 2.1, Task 2.2

**Technical Requirements**:
- Update import statement at line 18 of PerformanceMode.tsx
- Replace `AlphaTabRenderer` with `LazyAlphaTab` in JSX (line 406)
- No other changes required - props remain identical

**Current Code** (src/components/PerformanceMode.tsx line 18):
```typescript
import { AlphaTabRenderer } from './AlphaTabRenderer';
```

**Updated Code**:
```typescript
import { LazyAlphaTab } from './LazyAlphaTab';
```

**Current JSX** (line 406):
```tsx
<AlphaTabRenderer
  fileData={activeChart.storageBase64 || activeChart.url!}
  readOnly={true}
/>
```

**Updated JSX**:
```tsx
<LazyAlphaTab
  fileData={activeChart.storageBase64 || activeChart.url!}
  readOnly={true}
/>
```

**Acceptance Criteria**:
- [ ] Import changed from AlphaTabRenderer to LazyAlphaTab
- [ ] JSX component name changed from AlphaTabRenderer to LazyAlphaTab
- [ ] All existing props remain unchanged
- [ ] TypeScript compiles without errors
- [ ] Guitar tab renders correctly in PerformanceMode

---

## Phase 3: Verification & Testing

### Task 3.1: Verify TypeScript compilation and bundle splitting

**Description**: Run TypeScript type check and production build to verify bundle splitting
**Size**: Small
**Priority**: High
**Dependencies**: Task 2.1, Task 2.2, Task 2.3
**Can run parallel with**: None (verification step)

**Technical Requirements**:
- Run `npm run typecheck` to verify no type errors
- Run `npm run build` to create production bundle
- Verify AlphaTabRenderer is in separate chunk from main bundle
- Document chunk sizes before/after

**Commands**:
```bash
# Type check
npm run typecheck

# Production build with stats
npm run build

# Analyze build output - look for separate chunks
ls -la dist/assets/*.js
```

**Expected Bundle Structure**:
- Main bundle should NOT contain AlphaTab code
- Separate chunk for AlphaTabRenderer (should be ~800KB-1MB)
- SongDetail, PracticeRoom, PerformanceMode chunks should reference AlphaTab chunk

**Acceptance Criteria**:
- [ ] `npm run typecheck` passes with no errors
- [ ] `npm run build` completes successfully
- [ ] Build output shows AlphaTab in separate chunk
- [ ] Main bundle size reduced (should see ~37% reduction if AlphaTab was previously included)
- [ ] No runtime errors in browser console

---

### Task 3.2: Manual functional testing

**Description**: Manually test all AlphaTab functionality across routes
**Size**: Medium
**Priority**: High
**Dependencies**: Task 3.1
**Can run parallel with**: None (requires Task 3.1)

**Test Plan**:

1. **Dashboard Load Test**:
   - Open DevTools Network tab
   - Navigate to Dashboard (`/`)
   - Verify NO alphatab-related files are loaded
   - Verify page loads faster than before

2. **SongDetail Test**:
   - Navigate to any song with a Guitar Pro chart
   - Verify loading spinner appears briefly
   - Verify chart renders correctly
   - Verify read-only mode (no playback controls visible)

3. **PracticeRoom Test**:
   - Navigate to Practice Room
   - Select a song with Guitar Pro chart
   - Verify loading spinner appears
   - Verify chart renders
   - Test playback: play, pause, stop
   - Test tempo/speed controls
   - Test track selection
   - Test volume controls
   - Test loop functionality

4. **PerformanceMode Test**:
   - Navigate to Performance Mode
   - Select a setlist with Guitar Pro charts
   - Verify chart renders
   - Verify read-only mode works

5. **Loading State Test**:
   - Throttle network to "Slow 3G" in DevTools
   - Navigate to SongDetail
   - Verify loading spinner is visible during chunk load
   - Verify spinner message says "Loading guitar tab renderer..."

**Acceptance Criteria**:
- [ ] Dashboard loads without AlphaTab network requests
- [ ] SongDetail displays loading spinner then renders chart
- [ ] PracticeRoom playback controls all function correctly
- [ ] PerformanceMode renders charts correctly
- [ ] Loading spinner visible on slow connections
- [ ] No JavaScript errors in console

---

## Summary

| Phase | Tasks | Parallel Opportunities |
|-------|-------|----------------------|
| Phase 1: Foundation | 1 task | None |
| Phase 2: Consumer Updates | 3 tasks | All 3 can run in parallel |
| Phase 3: Verification | 2 tasks | Sequential |

**Total Tasks**: 5
**Critical Path**: Task 1.1 → Task 2.1/2.2/2.3 (parallel) → Task 3.1 → Task 3.2

**Expected Outcomes**:
- Main bundle size: ~2.8MB → ~1.8MB (37% reduction)
- Dashboard FCP: ~1.4s → ~0.82s (42% improvement)
- AlphaTab only loaded on demand when user accesses tab-rendering routes
