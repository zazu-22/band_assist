import { memo } from 'react';
import { PanelLeftClose, PanelLeftOpen, Clock } from 'lucide-react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';
import { PlaybackControls } from './PlaybackControls';
import { ChartTabs } from './ChartTabs';
import { TrackSelector } from './TrackSelector';
import { TempoControl } from './TempoControl';
import { MetronomeIndicator } from './MetronomeIndicator';
import { ProgressBar } from './ProgressBar';
import type { Song, SongChart } from '@/types';
import type { TrackInfo, PlaybackState, MetronomeState } from './types';

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
  return (
    <header
      className="border-b border-border bg-card shrink-0"
      data-testid="practice-control-bar"
    >
      {/* Main control row */}
      <div className="flex items-center gap-4 px-4 py-2 h-14">
        {/* Left: Toggle + Song info */}
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleSongList}
                  className={cn('h-9 w-9 p-0', showSongList && 'bg-muted')}
                  aria-label={showSongList ? 'Hide song list' : 'Show song list'}
                  data-testid="toggle-button"
                >
                  {showSongList ? (
                    <PanelLeftClose size={18} />
                  ) : (
                    <PanelLeftOpen size={18} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showSongList ? 'Hide song list' : 'Show song list'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="min-w-0">
            <h2 className="text-lg font-bold font-serif text-foreground truncate">
              {song?.title || 'Select a Song'}
            </h2>
            {song && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">{song.bpm} BPM</span>
                {song.key && (
                  <>
                    <span className="text-border">•</span>
                    <span>Key of {song.key}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Playback + Charts - flex-1, centered */}
        <div className="flex-1 flex items-center justify-center gap-4">
          {isGuitarPro && playbackState && onPlay && onPause && onStop && onToggleLoop && (
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
        </div>

        {/* Right: Track/BPM/Metronome */}
        <div className="flex items-center gap-3 shrink-0">
          {isGuitarPro && playbackState && tracks && currentTrackIndex !== undefined ? (
            <>
              {onSelectTrack && onToggleTrackMute && onToggleTrackSolo && (
                <TrackSelector
                  tracks={tracks}
                  currentTrackIndex={currentTrackIndex}
                  onSelectTrack={onSelectTrack}
                  onToggleMute={onToggleTrackMute}
                  onToggleSolo={onToggleTrackSolo}
                />
              )}

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
          ) : (
            // Non-GP metronome controls
            metronomeState && onMetronomeBpmChange && onMetronomeToggle && (
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1 border border-border">
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={onMetronomeToggle}
                        className={cn(
                          'p-2 rounded-md transition-colors',
                          metronomeState.isActive
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'text-muted-foreground hover:bg-background hover:text-foreground'
                        )}
                        aria-label={metronomeState.isActive ? 'Stop metronome' : 'Start metronome'}
                      >
                        <Clock size={18} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{metronomeState.isActive ? 'Stop metronome' : 'Start metronome'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <input
                  type="range"
                  min="40"
                  max="220"
                  value={metronomeState.bpm}
                  onChange={(e) => onMetronomeBpmChange(parseInt(e.target.value))}
                  className="w-20 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                  aria-label="Metronome BPM"
                />
                <span className="text-xs font-mono w-8 text-center tabular-nums text-foreground">
                  {metronomeState.bpm}
                </span>
              </div>
            )
          )}
        </div>
      </div>

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
