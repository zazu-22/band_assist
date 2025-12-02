import React, { Suspense, lazy } from 'react';
import { LoadingSpinner } from './ui';

// Import types for internal use and re-export for consumers
import type { AlphaTabHandle, TrackInfo } from './AlphaTabRenderer';
import type { AlphaTabState } from '@/components/practice/types';

export type { AlphaTabHandle, TrackInfo };

/**
 * Props for AlphaTabRenderer - matches the interface in AlphaTabRenderer.tsx
 */
interface AlphaTabRendererProps {
  /** Base64 Data URI of Guitar Pro file */
  fileData: string;
  /** External playback state control */
  isPlaying?: boolean;
  /** Legacy callback for playback state changes */
  onPlaybackChange?: (isPlaying: boolean) => void;
  /** Callback when player is ready with imperative handle */
  onReady?: (handle: AlphaTabHandle) => void;
  /** If true, disables player functionality (for read-only display) */
  readOnly?: boolean;
  /** Show built-in toolbar controls (default: true for backwards compat) */
  showControls?: boolean;
  /** Show built-in progress bar (default: true for backwards compat) */
  showProgressBar?: boolean;
  /** Callback when playback state changes (more detailed than onPlaybackChange) */
  onStateChange?: (state: AlphaTabState) => void;
  /** Callback for position updates (throttled to ~10 FPS) */
  onPositionChange?: (current: number, total: number) => void;
  /** Callback when tracks are loaded from score */
  onTracksLoaded?: (tracks: import('./AlphaTabRenderer').TrackInfo[]) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /**
   * Additional MIDI event types to include in the midiEventsPlayedFilter.
   * The metronome filter (AlphaTabMetronome) is always included by default.
   */
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
