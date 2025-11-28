/**
 * Practice Room Types Module
 *
 * Re-exports existing types from AlphaTabRenderer and adds new types
 * for the unified control bar integration.
 */

// Re-export existing types from AlphaTabRenderer
export type { AlphaTabHandle, TrackInfo } from '@/components/AlphaTabRenderer';

/**
 * Current state of AlphaTab playback, emitted via onStateChange callback.
 * All volume values use 0-1 range.
 */
export interface AlphaTabState {
  /** Whether playback is currently active */
  isPlaying: boolean;
  /** Whether loop mode is enabled */
  isLooping: boolean;
  /** Current playback speed multiplier (0.25 to 2.0) */
  currentSpeed: number;
  /** Current effective BPM (originalTempo * currentSpeed) */
  currentBPM: number;
  /** Original tempo from the score */
  originalTempo: number;
  /** Index of the currently rendered track */
  currentTrackIndex: number;
  /** Current metronome beat (0 = no beat, 1-4 = current beat) */
  metronomeBeat: number;
  /**
   * Master volume level (0-1).
   *
   * Note: This field is emitted by AlphaTabRenderer and accessible via the
   * imperative handle (getMasterVolume/setMasterVolume). It is included in
   * state for completeness and future UI controls (e.g., volume slider).
   * Not currently consumed by PracticeRoom but available for external use.
   */
  masterVolume: number;
  /**
   * Metronome volume level (0-1, 0 = disabled).
   *
   * Note: This field is emitted by AlphaTabRenderer and accessible via the
   * imperative handle (getMetronomeVolume/setMetronomeVolume). Included for
   * future metronome volume controls. Not currently consumed by PracticeRoom.
   */
  metronomeVolume: number;
  /**
   * Count-in volume level (0-1, 0 = disabled).
   *
   * Note: This field is emitted by AlphaTabRenderer and accessible via the
   * imperative handle (getCountInVolume/setCountInVolume). Included for
   * future count-in controls. Not currently consumed by PracticeRoom.
   */
  countInVolume: number;
}

/**
 * Props for AlphaTabRenderer with external control support.
 */
export interface AlphaTabRendererProps {
  /** Base64 Data URI of Guitar Pro file */
  fileData: string;
  /** If true, disables player functionality (for read-only display) */
  readOnly?: boolean;
  /** Show built-in toolbar controls (default: true for backwards compat) */
  showControls?: boolean;
  /** Show built-in progress bar (default: true for backwards compat) */
  showProgressBar?: boolean;
  /** Callback when player is ready with imperative handle */
  onReady?: (handle: import('@/components/AlphaTabRenderer').AlphaTabHandle) => void;
  /** Callback when playback state changes */
  onStateChange?: (state: AlphaTabState) => void;
  /** Callback for position updates (throttled to ~10 FPS) */
  onPositionChange?: (current: number, total: number) => void;
  /** Callback when tracks are loaded from score */
  onTracksLoaded?: (tracks: import('@/components/AlphaTabRenderer').TrackInfo[]) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;

  // Legacy props for backwards compatibility
  /** External playback state control */
  isPlaying?: boolean;
  /** Legacy callback for playback state changes */
  onPlaybackChange?: (isPlaying: boolean) => void;
}

/**
 * Playback state passed to PracticeControlBar for GP charts.
 */
export interface PlaybackState {
  isPlaying: boolean;
  isLooping: boolean;
  currentTime: number;
  totalTime: number;
  currentBPM: number;
  originalTempo: number;
  currentSpeed: number;
  metronomeBeat: number;
}

/**
 * Metronome state for non-GP chart modes.
 */
export interface MetronomeState {
  bpm: number;
  isActive: boolean;
}
