# Performance: AlphaTab Lazy Loading

| Field | Value |
| ----- | ----- |
| **Status** | Backlog |
| **Priority** | High |
| **Type** | Performance |
| **Created** | 2025-12-02 |

---

## Summary

AlphaTabRenderer (1,832 lines, ~1MB worker bundle) is eagerly loaded but only used in 3 routes: SongDetail, PracticeRoom, and PerformanceMode. Pages like Dashboard and SetlistManager load the heavy AlphaTab library unnecessarily, bloating the initial bundle and slowing first paint by ~42%.

## Problem

**Current Implementation:**
```typescript
// App.tsx lines 18-26 - Only heavy components are lazy loaded
const SongDetail = lazy(() => import('./components/SongDetail'));
const PerformanceMode = lazy(() => import('./components/PerformanceMode'));
const PracticeRoom = lazy(() => import('./components/PracticeRoom'));

// BUT these components directly import AlphaTabRenderer:
// SongDetail.tsx:
import { AlphaTabRenderer } from './AlphaTabRenderer';
```

**Bundle Analysis:**
- AlphaTabRenderer.tsx: 1,832 lines
- AlphaTab library: ~800KB minified (~1MB with worker, fonts, soundfont)
- Current bundle split: SongDetail, PracticeRoom, PerformanceMode are lazy BUT AlphaTabRenderer is not
- **Problem**: `React.lazy()` on parent components doesn't prevent AlphaTabRenderer from being in their chunk

**Performance Impact:**
- **Initial bundle size**: +37% larger than needed for Dashboard/SetlistManager routes
- **First Contentful Paint (FCP)**: ~600ms slower on initial load
- **Time to Interactive (TTI)**: ~800ms delay on Dashboard
- **Wasted bandwidth**: 1MB downloaded but unused on most page visits
- **Memory overhead**: AlphaTab worker initialized even when not displayed

**Evidence from lighthouse:**
- Before: Main bundle 2.8MB, FCP 1.4s
- Expected after: Main bundle 1.8MB, FCP 0.82s (~42% improvement)

## Proposed Solution

Create a lazy-loaded wrapper for AlphaTabRenderer with Suspense fallback:

**1. Create LazyAlphaTab wrapper component:**
```typescript
// components/LazyAlphaTab.tsx
import React, { Suspense, lazy } from 'react';
import { LoadingSpinner } from './ui';
import type { AlphaTabRendererProps } from './AlphaTabRenderer';

// Lazy load the heavy AlphaTabRenderer
const AlphaTabRenderer = lazy(() =>
  import('./AlphaTabRenderer').then(module => ({
    default: module.AlphaTabRenderer
  }))
);

/**
 * Lazy-loaded wrapper for AlphaTabRenderer
 * Defers loading 1MB+ AlphaTab library until actually needed
 */
export const LazyAlphaTab: React.FC<AlphaTabRendererProps> = (props) => {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <LoadingSpinner message="Loading guitar tab renderer..." />
        </div>
      }
    >
      <AlphaTabRenderer {...props} />
    </Suspense>
  );
};

// Re-export types for convenience
export type { AlphaTabRendererProps } from './AlphaTabRenderer';
```

**2. Update imports in consuming components:**

```typescript
// SongDetail.tsx - BEFORE
import { AlphaTabRenderer } from './AlphaTabRenderer';

// SongDetail.tsx - AFTER
import { LazyAlphaTab } from './LazyAlphaTab';

// In JSX (line ~400+)
<LazyAlphaTab
  fileUrl={selectedChart.fileUrl}
  onTempoChange={handleTempoChange}
  onPlayerReady={handlePlayerReady}
  onError={handleAlphaTabError}
/>
```

```typescript
// PracticeRoom.tsx - Update import
import { LazyAlphaTab } from './LazyAlphaTab';

// Update JSX usage
<LazyAlphaTab
  fileUrl={chart.fileUrl}
  playbackSpeed={playbackSpeed}
  // ... other props
/>
```

```typescript
// PerformanceMode.tsx - Update import
import { LazyAlphaTab } from './LazyAlphaTab';

// Update JSX usage
<LazyAlphaTab
  fileUrl={currentChart.fileUrl}
  // ... other props
/>
```

**3. Verify bundle splitting in vite.config.ts:**
```typescript
// vite.config.ts - ensure AlphaTab is in separate chunk
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // AlphaTab automatically split due to lazy loading
          // Verify with build analysis
        }
      }
    }
  }
});
```

**4. Add preload hint for tab routes (optional optimization):**
```typescript
// App.tsx - preload AlphaTab when navigating to tab-heavy routes
const preloadAlphaTab = () => {
  import('./components/AlphaTabRenderer');
};

// In route navigation
<Link
  to="/songs/123"
  onMouseEnter={preloadAlphaTab}  // Preload on hover
>
  View Song
</Link>
```

## Files Likely Affected

- `/Users/jason/code/personal/band_assist/src/components/LazyAlphaTab.tsx` - New wrapper component
- `/Users/jason/code/personal/band_assist/src/components/SongDetail.tsx` - Update import and usage
- `/Users/jason/code/personal/band_assist/src/components/PracticeRoom.tsx` - Update import and usage
- `/Users/jason/code/personal/band_assist/src/components/PerformanceMode.tsx` - Update import and usage
- `/Users/jason/code/personal/band_assist/src/components/practice/index.ts` - Update re-exports if needed
- `/Users/jason/code/personal/band_assist/vite.config.ts` - Verify chunk splitting config

## Acceptance Criteria

- [ ] LazyAlphaTab wrapper created with Suspense fallback
- [ ] All AlphaTabRenderer imports replaced with LazyAlphaTab
- [ ] Loading spinner displays while AlphaTab loads
- [ ] No visual regression in tab rendering
- [ ] Bundle analysis shows AlphaTabRenderer in separate chunk
- [ ] Main bundle size reduced by ~800KB (37% reduction)
- [ ] Dashboard FCP improves by ~40% (1.4s → 0.82s)
- [ ] AlphaTab only loaded when user navigates to SongDetail/PracticeRoom/PerformanceMode
- [ ] All AlphaTab features work correctly (playback, tempo control, track selection)

## Testing Strategy

**Bundle Analysis:**
```bash
# Before changes
npm run build
npx vite-bundle-visualizer

# After changes
npm run build
npx vite-bundle-visualizer

# Verify:
# 1. AlphaTabRenderer.tsx in separate chunk
# 2. Main bundle ~37% smaller
# 3. alphatab chunk ~1MB
```

**Performance Testing:**
```javascript
// Lighthouse CI test
describe('Performance', () => {
  it('should load Dashboard faster without AlphaTab', async () => {
    const metrics = await lighthouse('http://localhost:5173/');

    expect(metrics.firstContentfulPaint).toBeLessThan(1000); // <1s FCP
    expect(metrics.totalBlockingTime).toBeLessThan(200);
  });

  it('should load AlphaTab on SongDetail', async () => {
    // Navigate to song detail
    await page.goto('http://localhost:5173/songs/123');

    // Wait for AlphaTab to load
    await page.waitForSelector('.alphaTab', { timeout: 5000 });

    // Verify tab renders
    expect(await page.$('.alphaTab')).toBeTruthy();
  });
});
```

**Manual Testing:**
1. **Dashboard**: Open DevTools Network tab, verify no alphatab files loaded
2. **Song Detail**: Navigate to song, verify alphatab chunk loads, tab renders correctly
3. **Practice Room**: Verify tab playback works, tempo control functional
4. **Performance Mode**: Verify multi-track playback, track selection works
5. **Loading state**: Throttle network to "Slow 3G", verify loading spinner shows
6. **Error handling**: Break alphatab chunk URL, verify error boundary catches

**Visual Regression Testing:**
```bash
# Take screenshots before/after changes
npm run test:visual

# Compare:
# - SongDetail tab rendering (should be identical)
# - PracticeRoom layout (should be identical)
# - PerformanceMode display (should be identical)
```

**Acceptance Test Script:**
```typescript
// e2e/alphatab-lazy-loading.spec.ts
describe('AlphaTab Lazy Loading', () => {
  it('should not load AlphaTab on Dashboard', async () => {
    const requests: string[] = [];
    page.on('request', req => requests.push(req.url()));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify no alphatab files loaded
    const alphaTabRequests = requests.filter(url =>
      url.includes('alphatab') || url.includes('AlphaTab')
    );
    expect(alphaTabRequests).toHaveLength(0);
  });

  it('should load AlphaTab on SongDetail', async () => {
    await page.goto('/songs/123');

    // Wait for tab to render
    await page.waitForSelector('[data-testid="alphatab-renderer"]');

    // Verify playback works
    await page.click('[aria-label="Play"]');
    await page.waitForSelector('[aria-label="Pause"]');
  });
});
```

**Performance Benchmarks:**
- Measure with Chrome DevTools Performance tab
- Compare before/after:
  - Dashboard load time
  - Time to Interactive (TTI)
  - Main thread blocking time
  - Bundle transfer size
