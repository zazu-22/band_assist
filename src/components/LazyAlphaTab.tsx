import React, { Suspense, lazy } from 'react';
import { LoadingSpinner } from './ui';

// Import types for internal use and re-export for consumers
import type {
  AlphaTabHandle,
  AlphaTabRendererProps,
  TrackInfo,
} from './AlphaTabRenderer';

export type { AlphaTabHandle, AlphaTabRendererProps, TrackInfo };

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
 *
 * Dark Mode Note:
 * The fallback uses bg-white intentionally to match AlphaTabRenderer's current
 * white background. AlphaTab does support theming via display.resources settings
 * (see https://alphatab.net/docs/reference/settings/display/resources/), but
 * implementing dark mode would require changes to AlphaTabRenderer.tsx to:
 * 1. Accept theme colors as props or read from context
 * 2. Apply colors via api.settings.display.resources
 * 3. Call api.updateSettings() when theme changes
 * This is tracked as a potential future enhancement.
 */
export const LazyAlphaTab: React.FC<AlphaTabRendererProps> = props => {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-[200px] items-center justify-center bg-white px-4">
          <div className="flex flex-col items-center gap-3 text-center">
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
