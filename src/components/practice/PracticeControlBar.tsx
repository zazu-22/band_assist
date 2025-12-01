import { memo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { PanelLeftClose, PanelLeftOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { PlaybackControls } from './PlaybackControls';
import { ChartTabs } from './ChartTabs';
import { TrackSelector } from './TrackSelector';
import { TempoControl } from './TempoControl';
import { MetronomeIndicator } from './MetronomeIndicator';
import { MetronomeControls } from './MetronomeControls';
import { ProgressBar } from './ProgressBar';
import type { Song, SongChart } from '@/types';
import type { TrackInfo, PlaybackState, MetronomeState } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Minimum scroll distance (in pixels) before showing fade indicators.
 * This threshold prevents flickering when content is at the edge of the
 * scrollable area with minor floating-point variations.
 */
const SCROLL_FADE_THRESHOLD_PX = 4;

// =============================================================================
// SCROLLABLE CONTAINER WITH FADE INDICATORS
// =============================================================================

interface ScrollableContainerProps {
  children: React.ReactNode;
  className?: string;
  fadeClassName?: string;
}

/**
 * A horizontally scrollable container with fade gradient overlays
 * that indicate when more content is available to scroll.
 */
const ScrollableContainer = memo(function ScrollableContainer({
  children,
  className,
  fadeClassName = 'from-card',
}: ScrollableContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  // Track if initial check has been done to avoid re-running on each render
  const hasInitialized = useRef(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const hasOverflow = scrollWidth > clientWidth;

    setShowLeftFade(hasOverflow && scrollLeft > SCROLL_FADE_THRESHOLD_PX);
    setShowRightFade(hasOverflow && scrollLeft < scrollWidth - clientWidth - SCROLL_FADE_THRESHOLD_PX);
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Set up scroll listener
    const handleScroll = () => checkScroll();
    el.addEventListener('scroll', handleScroll, { passive: true });

    // Set up resize observer to detect content/container size changes.
    // The ResizeObserver callback invokes checkScroll() which updates state.
    // This is intentional: ResizeObserver fires asynchronously after layout
    // changes, similar to event handlers, and is safe to call setState from.
    const resizeObserver = new ResizeObserver(() => {
      checkScroll();
    });
    resizeObserver.observe(el);

    // Initial check after layout settles (deferred to avoid sync setState in effect body)
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      requestAnimationFrame(() => {
        checkScroll();
      });
    }

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [checkScroll]);

  return (
    <div className="relative min-w-0 flex-1">
      {/* Left fade indicator */}
      <div
        className={cn(
          'pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10',
          'bg-gradient-to-r to-transparent transition-opacity duration-200',
          fadeClassName,
          showLeftFade ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
      >
        <ChevronLeft
          size={16}
          className={cn(
            'absolute left-1 top-1/2 -translate-y-1/2 text-muted-foreground',
            'transition-opacity duration-200',
            showLeftFade ? 'opacity-70' : 'opacity-0'
          )}
        />
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className={cn('overflow-x-auto scrollbar-hide touch-pan-x', className)}
      >
        {children}
      </div>

      {/* Right fade indicator */}
      <div
        className={cn(
          'pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10',
          'bg-gradient-to-l to-transparent transition-opacity duration-200',
          fadeClassName,
          showRightFade ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
      >
        <ChevronRight
          size={16}
          className={cn(
            'absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground',
            'transition-opacity duration-200',
            showRightFade ? 'opacity-70' : 'opacity-0'
          )}
        />
      </div>
    </div>
  );
});

ScrollableContainer.displayName = 'ScrollableContainer';

export interface PracticeControlBarProps {
  // Song info
  song: Song | null;

  // Song list toggle
  showSongList: boolean;
  onToggleSongList: () => void;

  // Chart selection
  charts: SongChart[];
  activeChartId: string | null;
  onSelectChart: (id: string) => void;
  /** ID of the chart display panel (for ARIA tab/tabpanel relationship) */
  chartPanelId?: string;

  // Playback state (for GP charts)
  isGuitarPro: boolean;
  playbackState?: PlaybackState;

  // Playback controls (for GP charts)
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onSeek?: (percentage: number) => void;
  onToggleLoop?: () => void;
  onSetBPM?: (bpm: number) => void;
  onResetTempo?: () => void;

  // Track controls (for GP charts)
  tracks?: TrackInfo[];
  currentTrackIndex?: number;
  onSelectTrack?: (index: number) => void;
  onToggleTrackMute?: (index: number) => void;
  onToggleTrackSolo?: (index: number) => void;

  // Non-GP metronome controls
  metronomeState?: MetronomeState;
  onMetronomeBpmChange?: (bpm: number) => void;
  onMetronomeToggle?: () => void;
}

export const PracticeControlBar = memo(function PracticeControlBar({
  song,
  showSongList,
  onToggleSongList,
  charts,
  activeChartId,
  onSelectChart,
  chartPanelId,
  isGuitarPro,
  playbackState,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onToggleLoop,
  onSetBPM,
  onResetTempo,
  tracks,
  currentTrackIndex,
  onSelectTrack,
  onToggleTrackMute,
  onToggleTrackSolo,
  metronomeState,
  onMetronomeBpmChange,
  onMetronomeToggle,
}: PracticeControlBarProps) {
  const isMobile = useIsMobile();

  // Determine if we should show the GP controls row
  const showGpControlsRow =
    isGuitarPro && playbackState && onPlay && onPause && onStop && onToggleLoop;

  // Determine if we have secondary controls to show (track, tempo, metronome for GP)
  const hasSecondaryGpControls =
    isGuitarPro &&
    playbackState &&
    tracks &&
    currentTrackIndex !== undefined &&
    onSelectTrack &&
    onToggleTrackMute &&
    onToggleTrackSolo;

  return (
    <header className="border-b border-border bg-card shrink-0" data-testid="practice-control-bar">
      {/* Main control row - Song info + Chart tabs */}
      <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-2 h-14">
        {/* Left: Toggle + Song info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleSongList}
                  className={cn('h-11 w-11 sm:h-9 sm:w-9 p-0', showSongList && 'bg-muted')}
                  aria-label={showSongList ? 'Hide song list' : 'Show song list'}
                  data-testid="toggle-button"
                >
                  {showSongList ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showSongList ? 'Hide song list' : 'Show song list'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="min-w-0 max-w-[120px] sm:max-w-none">
            <h2 className="text-base sm:text-lg font-bold font-serif text-foreground truncate">
              {song?.title || 'Select a Song'}
            </h2>
            {song && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">{song.bpm} BPM</span>
                {song.key && (
                  <>
                    <span className="text-border hidden sm:inline">•</span>
                    <span className="hidden sm:inline">Key of {song.key}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center/Right: Chart tabs (desktop also includes playback) */}
        <ScrollableContainer className="flex items-center gap-2 sm:gap-4">
          {/* Desktop only: inline playback controls */}
          {!isMobile && showGpControlsRow && (
            <PlaybackControls
              isPlaying={playbackState.isPlaying}
              isLooping={playbackState.isLooping}
              disabled={!song}
              onPlay={onPlay}
              onPause={onPause}
              onStop={onStop}
              onToggleLoop={onToggleLoop}
            />
          )}

          <ChartTabs
            charts={charts}
            activeChartId={activeChartId}
            onSelectChart={onSelectChart}
            panelId={chartPanelId}
          />

          {/* Desktop only: secondary GP controls */}
          {!isMobile && hasSecondaryGpControls && (
            <>
              <TrackSelector
                tracks={tracks}
                currentTrackIndex={currentTrackIndex}
                onSelectTrack={onSelectTrack}
                onToggleMute={onToggleTrackMute}
                onToggleSolo={onToggleTrackSolo}
              />

              {onSetBPM && onResetTempo && (
                <TempoControl
                  currentBPM={playbackState.currentBPM}
                  originalTempo={playbackState.originalTempo}
                  currentSpeed={playbackState.currentSpeed}
                  onSetBPM={onSetBPM}
                  onReset={onResetTempo}
                />
              )}

              <MetronomeIndicator currentBeat={playbackState.metronomeBeat} />
            </>
          )}

          {/* Desktop only: non-GP metronome */}
          {!isMobile &&
            !isGuitarPro &&
            metronomeState &&
            onMetronomeBpmChange &&
            onMetronomeToggle && (
              <MetronomeControls
                metronomeState={metronomeState}
                onBpmChange={onMetronomeBpmChange}
                onToggle={onMetronomeToggle}
                variant="compact"
              />
            )}
        </ScrollableContainer>
      </div>

      {/* Mobile: Dedicated transport controls row for GP */}
      {isMobile && showGpControlsRow && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border/50 bg-card/80">
          {/* Transport controls - always visible on mobile */}
          <div className="shrink-0">
            <PlaybackControls
              isPlaying={playbackState.isPlaying}
              isLooping={playbackState.isLooping}
              disabled={!song}
              onPlay={onPlay}
              onPause={onPause}
              onStop={onStop}
              onToggleLoop={onToggleLoop}
            />
          </div>

          {/* Secondary controls - scrollable with fade */}
          <ScrollableContainer className="flex items-center gap-2">
            {hasSecondaryGpControls && (
              <>
                <TrackSelector
                  tracks={tracks}
                  currentTrackIndex={currentTrackIndex}
                  onSelectTrack={onSelectTrack}
                  onToggleMute={onToggleTrackMute}
                  onToggleSolo={onToggleTrackSolo}
                />

                {onSetBPM && onResetTempo && (
                  <TempoControl
                    currentBPM={playbackState.currentBPM}
                    originalTempo={playbackState.originalTempo}
                    currentSpeed={playbackState.currentSpeed}
                    onSetBPM={onSetBPM}
                    onReset={onResetTempo}
                  />
                )}

                <MetronomeIndicator currentBeat={playbackState.metronomeBeat} />
              </>
            )}
          </ScrollableContainer>
        </div>
      )}

      {/* Mobile: Non-GP metronome controls row */}
      {isMobile &&
        !isGuitarPro &&
        metronomeState &&
        onMetronomeBpmChange &&
        onMetronomeToggle && (
          <div className="flex items-center justify-center gap-2 px-3 py-2 border-t border-border/50 bg-card/80">
            <MetronomeControls
              metronomeState={metronomeState}
              onBpmChange={onMetronomeBpmChange}
              onToggle={onMetronomeToggle}
              variant="expanded"
            />
          </div>
        )}

      {/* Progress bar row - only for GP */}
      {isGuitarPro && playbackState && playbackState.totalTime > 0 && onSeek && (
        <ProgressBar
          currentTime={playbackState.currentTime}
          totalTime={playbackState.totalTime}
          onSeek={onSeek}
        />
      )}
    </header>
  );
});

PracticeControlBar.displayName = 'PracticeControlBar';
