/**
 * Practice Module
 *
 * Exports types and components for the Practice Room unified control bar.
 */

// Types
export type {
  AlphaTabHandle,
  TrackInfo,
  AlphaTabState,
  AlphaTabRendererProps,
  PlaybackState,
  MetronomeState,
} from './types';

// Components
export { PlaybackControls } from './PlaybackControls';
export type { PlaybackControlsProps } from './PlaybackControls';

export { ChartTabs } from './ChartTabs';
export type { ChartTabsProps } from './ChartTabs';

export { TrackSelector } from './TrackSelector';
export type { TrackSelectorProps } from './TrackSelector';

export { TempoControl } from './TempoControl';
export type { TempoControlProps } from './TempoControl';

export { MetronomeIndicator } from './MetronomeIndicator';
export type { MetronomeIndicatorProps } from './MetronomeIndicator';

export { MetronomeControls } from './MetronomeControls';
export type { MetronomeControlsProps } from './MetronomeControls';

export { ProgressBar } from './ProgressBar';
export type { ProgressBarProps } from './ProgressBar';

export { PracticeControlBar } from './PracticeControlBar';
export type { PracticeControlBarProps } from './PracticeControlBar';

export { SectionNav, calculateSectionSeekPercentage } from './SectionNav';
export type { SectionNavProps } from './SectionNav';
