import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  memo,
  useMemo,
  useCallback,
} from 'react';
import { Song } from '@/types';
import {
  Play,
  Pause,
  Rewind,
  FastForward,
  Volume2,
  Music,
  Gauge,
  ListMusic,
  Music2,
  Guitar,
} from 'lucide-react';
import { SmartTabEditor } from './SmartTabEditor';
import { LazyAlphaTab } from './LazyAlphaTab';
import type { AlphaTabHandle } from './LazyAlphaTab';
import { EmptyState, ResizablePanel, StatusBadge, ErrorBoundary } from './ui';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';
import { getAudioContext, activateAudioContext } from '@/lib/audioContext';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { useDerivedState, usePrevious } from '@/hooks/useDerivedState';
import { useBlobUrl } from '@/hooks/useBlobUrl';
import { PracticeControlBar, type AlphaTabState, type TrackInfo } from './practice';

// =============================================================================
// TYPES
// =============================================================================

interface PracticeRoomProps {
  songs: Song[];
  onNavigateToSong?: (id: string) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PLAYBACK_RATES = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1.0, label: '1.0x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
] as const;

// =============================================================================
// UTILITIES
// =============================================================================

function formatTime(time: number): string {
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SongListItemProps {
  song: Song;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const SongListItem = memo(function SongListItem({ song, isSelected, onSelect }: SongListItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(song.id)}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-border/30',
        'border-l-[3px]',
        'hover:bg-muted/30 transition-colors motion-reduce:transition-none',
        isSelected ? 'bg-muted/50 border-l-primary' : 'border-l-primary/60'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate text-sm">{song.title}</p>
          <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={song.status} />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">{song.bpm} BPM</span>
        {song.key && <span>{song.key}</span>}
        {song.charts.length > 0 && (
          <span className="flex items-center gap-1">
            <Music2 size={10} />
            {song.charts.length} {song.charts.length === 1 ? 'chart' : 'charts'}
          </span>
        )}
      </div>
    </button>
  );
});

SongListItem.displayName = 'SongListItem';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PracticeRoom: React.FC<PracticeRoomProps> = memo(function PracticeRoom({ songs }) {
  const isMobile = useIsMobile();

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [selectedSongId, setSelectedSongId] = useState<string | null>(
    songs.length > 0 ? songs[0].id : null
  );
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(0.8);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [showSongList, setShowSongList] = useState(!isMobile);

  // Derived state that resets when song changes
  const currentSong = useMemo(
    () => songs.find(s => s.id === selectedSongId),
    [songs, selectedSongId]
  );

  // Blob URL for backing track audio (handles Base64 data URI conversion and cleanup)
  const audioSrc = useBlobUrl(currentSong?.backingTrackUrl);

  const [metronomeBpm, setMetronomeBpm] = useDerivedState(currentSong?.bpm ?? 120, selectedSongId);
  const [activeChartId, setActiveChartId] = useDerivedState<string | null>(
    currentSong?.charts[0]?.id ?? null,
    selectedSongId
  );

  // AlphaTab control state
  const alphaTabRef = useRef<AlphaTabHandle | null>(null);
  const [gpState, setGpState] = useState<AlphaTabState | null>(null);
  const [gpTracks, setGpTracks] = useState<TrackInfo[]>([]);
  const [gpPosition, setGpPosition] = useState({ current: 0, total: 0 });

  // ---------------------------------------------------------------------------
  // CONSTANTS
  // ---------------------------------------------------------------------------

  // ARIA panel ID for tab/tabpanel relationship
  const CHART_PANEL_ID = 'practice-room-chart-panel';

  // ---------------------------------------------------------------------------
  // REFS
  // ---------------------------------------------------------------------------

  const audioRef = useRef<HTMLAudioElement>(null);
  const metronomeInterval = useRef<NodeJS.Timeout | null>(null);

  // ---------------------------------------------------------------------------
  // MEMOIZED VALUES
  // ---------------------------------------------------------------------------

  const activeChart = useMemo(
    () => currentSong?.charts.find(c => c.id === activeChartId),
    [currentSong, activeChartId]
  );

  const isGuitarPro = activeChart?.type === 'GP';

  // Song stats for header
  const songStats = useMemo(() => {
    const total = songs.length;
    const ready = songs.filter(s => s.status === 'Performance Ready').length;
    const inProgress = songs.filter(s => s.status === 'In Progress').length;
    const toLearn = songs.filter(s => s.status === 'To Learn').length;
    return { total, ready, inProgress, toLearn };
  }, [songs]);

  // Build playback state object for PracticeControlBar
  const gpPositionCurrent = gpPosition.current;
  const gpPositionTotal = gpPosition.total;
  const playbackState = useMemo(() => {
    if (!gpState) return undefined;
    return {
      isPlaying: gpState.isPlaying,
      isLooping: gpState.isLooping,
      currentTime: gpPositionCurrent,
      totalTime: gpPositionTotal,
      currentBPM: gpState.currentBPM,
      originalTempo: gpState.originalTempo,
      currentSpeed: gpState.currentSpeed,
      metronomeBeat: gpState.metronomeBeat,
    };
  }, [gpState, gpPositionCurrent, gpPositionTotal]);

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Track previous GP state for cleanup on transition
  const prevIsGuitarPro = usePrevious(isGuitarPro);

  // Consolidated cleanup in useLayoutEffect to prevent race condition between ref and state
  // Both ref and state are reset synchronously to maintain consistency
  useLayoutEffect(() => {
    // Only reset when transitioning from GP to non-GP (not on initial render)
    if (prevIsGuitarPro === true && !isGuitarPro) {
      // Clear ref and state together to prevent mismatches
      alphaTabRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: cleanup state on chart type transition (consolidated with ref cleanup to prevent race condition)
      setGpState(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGpTracks([]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGpPosition({ current: 0, total: 0 });
    }

    // Cleanup on unmount to prevent stale state if component remounts
    return () => {
      alphaTabRef.current = null;
    };
  }, [isGuitarPro, prevIsGuitarPro]);

  // Audio Element Management
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = volume;
    }
  }, [playbackRate, volume]);

  // Metronome Logic
  useEffect(() => {
    if (metronomeActive) {
      // Activate shared audio context on toggle (user gesture)
      activateAudioContext().catch(err =>
        console.warn('[PracticeRoom] Audio activation failed:', err)
      );

      const ms = 60000 / metronomeBpm;
      metronomeInterval.current = setInterval(() => {
        const ctx = getAudioContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 1000;
        gain.gain.value = 0.1;
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }, ms);
    } else {
      if (metronomeInterval.current) clearInterval(metronomeInterval.current);
    }
    return () => {
      if (metronomeInterval.current) clearInterval(metronomeInterval.current);
    };
  }, [metronomeActive, metronomeBpm]);

  // ---------------------------------------------------------------------------
  // ALPHATAB CALLBACKS
  // ---------------------------------------------------------------------------

  const handleAlphaTabReady = useCallback((handle: AlphaTabHandle) => {
    alphaTabRef.current = handle;
  }, []);

  const handleAlphaTabStateChange = useCallback((state: AlphaTabState) => {
    setGpState(state);
  }, []);

  const handleAlphaTabPositionChange = useCallback((current: number, total: number) => {
    setGpPosition({ current, total });
  }, []);

  const handleAlphaTabTracksLoaded = useCallback((tracks: TrackInfo[]) => {
    setGpTracks(tracks);
  }, []);

  // ---------------------------------------------------------------------------
  // CONTROL BAR PLAYBACK CALLBACKS
  // ---------------------------------------------------------------------------

  const handlePlay = useCallback(() => {
    alphaTabRef.current?.play();
  }, []);

  const handlePause = useCallback(() => {
    alphaTabRef.current?.pause();
  }, []);

  const handleStop = useCallback(() => {
    alphaTabRef.current?.stop();
  }, []);

  const handleGpSeek = useCallback((percentage: number) => {
    alphaTabRef.current?.seekTo(percentage);
  }, []);

  const handleToggleLoop = useCallback(() => {
    if (alphaTabRef.current && gpState) {
      alphaTabRef.current.setLoop(!gpState.isLooping);
    }
  }, [gpState]);

  const handleSetBPM = useCallback(
    (bpm: number) => {
      if (alphaTabRef.current && gpState) {
        const speed = bpm / gpState.originalTempo;
        alphaTabRef.current.setPlaybackSpeed(speed);
      }
    },
    [gpState]
  );

  const handleResetTempo = useCallback(() => {
    alphaTabRef.current?.setPlaybackSpeed(1.0);
  }, []);

  const handleSelectTrack = useCallback((index: number) => {
    alphaTabRef.current?.renderTrack(index);
  }, []);

  const handleToggleTrackMute = useCallback((index: number) => {
    alphaTabRef.current?.toggleTrackMute(index);
  }, []);

  const handleToggleTrackSolo = useCallback((index: number) => {
    alphaTabRef.current?.toggleTrackSolo(index);
  }, []);

  // ---------------------------------------------------------------------------
  // OTHER CALLBACKS
  // ---------------------------------------------------------------------------

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleRewind = useCallback(() => {
    if (audioRef.current) audioRef.current.currentTime -= 5;
  }, []);

  const handleFastForward = useCallback(() => {
    if (audioRef.current) audioRef.current.currentTime += 5;
  }, []);

  const handlePlaybackEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleSongSelect = useCallback(
    (id: string) => {
      setSelectedSongId(id);
      // Auto-hide song list on mobile after selection
      if (isMobile) {
        setShowSongList(false);
      }
    },
    [isMobile]
  );

  const toggleSongList = useCallback(() => {
    setShowSongList(prev => !prev);
  }, []);

  const toggleMetronome = useCallback(() => {
    setMetronomeActive(prev => !prev);
  }, []);

  const handlePlaybackRateChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPlaybackRate(parseFloat(e.target.value));
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  }, []);

  // ---------------------------------------------------------------------------
  // RENDER: Empty State
  // ---------------------------------------------------------------------------

  if (songs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-background p-4 sm:p-6 lg:p-10">
        <EmptyState
          icon={Music}
          title="No songs to practice"
          description="Add songs to your setlist to start practicing with charts, backing tracks, and metronome."
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Main Content
  // ---------------------------------------------------------------------------

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      {/* Unified Control Bar */}
      <PracticeControlBar
        song={currentSong ?? null}
        showSongList={showSongList}
        onToggleSongList={toggleSongList}
        charts={currentSong?.charts ?? []}
        activeChartId={activeChartId}
        onSelectChart={setActiveChartId}
        chartPanelId={CHART_PANEL_ID}
        isGuitarPro={isGuitarPro}
        playbackState={playbackState}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onSeek={handleGpSeek}
        onToggleLoop={handleToggleLoop}
        onSetBPM={handleSetBPM}
        onResetTempo={handleResetTempo}
        tracks={gpTracks}
        currentTrackIndex={gpState?.currentTrackIndex}
        onSelectTrack={handleSelectTrack}
        onToggleTrackMute={handleToggleTrackMute}
        onToggleTrackSolo={handleToggleTrackSolo}
        metronomeState={{ bpm: metronomeBpm, isActive: metronomeActive }}
        onMetronomeBpmChange={setMetronomeBpm}
        onMetronomeToggle={toggleMetronome}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Song List */}
        {showSongList &&
          (isMobile ? (
            <Card className="w-64 border-r border-border rounded-none overflow-hidden shrink-0 animate-slide-in-from-left">
              <CardHeader className="py-2.5 px-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListMusic size={16} className="text-primary" />
                    <h3 className="text-sm font-serif text-foreground">Songs</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      {songStats.ready}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-info" />
                      {songStats.inProgress}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-warning" />
                      {songStats.toLearn}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto h-[calc(100%-44px)]">
                {songs.map(song => (
                  <SongListItem
                    key={song.id}
                    song={song}
                    isSelected={selectedSongId === song.id}
                    onSelect={handleSongSelect}
                  />
                ))}
              </CardContent>
            </Card>
          ) : (
            <ResizablePanel
              defaultWidth={280}
              minWidth={220}
              maxWidth={400}
              storageKey="practice_songlist"
              className="border-r border-border overflow-hidden hidden md:block animate-slide-in-from-left"
            >
              <Card className="h-full rounded-none border-0">
                <CardHeader className="py-2.5 px-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListMusic size={16} className="text-primary" />
                      <h3 className="text-sm font-serif text-foreground">Songs</h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-success" />
                        {songStats.ready}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-info" />
                        {songStats.inProgress}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-warning" />
                        {songStats.toLearn}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-y-auto h-[calc(100%-44px)]">
                  {songs.map(song => (
                    <SongListItem
                      key={song.id}
                      song={song}
                      isSelected={selectedSongId === song.id}
                      onSelect={handleSongSelect}
                    />
                  ))}
                </CardContent>
              </Card>
            </ResizablePanel>
          ))}

        {/* Main Stage */}
        <div className="flex-1 flex flex-col relative min-w-0">
          {/* Content Viewer */}
          <div
            id={CHART_PANEL_ID}
            role="tabpanel"
            aria-label="Chart display"
            className={cn(
              'flex-1 overflow-hidden bg-background',
              isGuitarPro ? 'p-0' : 'p-4 sm:p-6 overflow-y-auto'
            )}
          >
            {activeChart ? (
              <div className={cn('w-full h-full', !isGuitarPro && 'max-w-4xl mx-auto')}>
                {activeChart.type === 'TEXT' ? (
                  <Card className="overflow-hidden h-full min-h-[500px]">
                    <SmartTabEditor
                      content={activeChart.content || ''}
                      onChange={() => {}}
                      annotations={activeChart.annotations || []}
                      onUpdateAnnotations={() => {}}
                      readOnly={true}
                    />
                  </Card>
                ) : activeChart.type === 'PDF' ? (
                  <Card className="overflow-hidden">
                    <iframe
                      src={activeChart.url}
                      className="w-full h-[800px] border-0"
                      title="PDF Chart Viewer"
                    />
                  </Card>
                ) : activeChart.type === 'GP' ? (
                  <ErrorBoundary
                    fallback={
                      <div className="flex flex-col items-center justify-center h-full bg-muted text-muted-foreground p-8">
                        <Guitar size={48} className="opacity-40 mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          Guitar Pro Render Error
                        </h3>
                        <p className="text-sm text-center max-w-md mb-4">
                          An unexpected error occurred while rendering this file. Try refreshing the
                          page or re-uploading the file in a different format.
                        </p>
                        <Button
                          onClick={() => window.location.reload()}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          Refresh Page
                        </Button>
                      </div>
                    }
                  >
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
                  </ErrorBoundary>
                ) : (
                  <Card className="overflow-hidden">
                    <img src={activeChart.url} alt="Chart" className="w-full h-auto" />
                  </Card>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="p-4 rounded-full bg-muted">
                  <Music size={48} className="text-muted-foreground/40" />
                </div>
                <div className="text-center">
                  <p className="text-foreground font-medium">No chart selected</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select a chart above or add one in Song Details
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Player Deck (Hidden if GP active - GP has its own player in control bar) */}
          {!isGuitarPro && (
            <Card className="rounded-none border-x-0 border-b-0 shrink-0 z-20 animate-slide-in-from-bottom animation-forwards">
              <CardContent className="flex items-center gap-4 sm:gap-6 px-4 sm:px-6 py-4">
                {/* Playback Controls */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRewind}
                          className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                          aria-label="Rewind 5 seconds"
                        >
                          <Rewind size={18} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Rewind 5s</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Button
                    onClick={togglePlay}
                    disabled={!audioSrc}
                    className={cn(
                      'w-12 h-12 rounded-full p-0',
                      audioSrc
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:scale-105 transition-transform'
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                    )}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                  </Button>

                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleFastForward}
                          className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                          aria-label="Forward 5 seconds"
                        >
                          <FastForward size={18} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Forward 5s</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Progress Bar */}
                <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                    aria-label="Seek"
                  />
                  <div className="flex justify-between text-xs font-mono text-muted-foreground tabular-nums">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Speed & Volume - Hidden on mobile */}
                <div className="hidden sm:flex items-center gap-4 shrink-0">
                  {/* Speed */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                      <Gauge size={10} /> Speed
                    </div>
                    <select
                      value={playbackRate}
                      onChange={handlePlaybackRateChange}
                      className="bg-muted text-foreground text-xs rounded px-2 py-1 border border-border outline-none focus:ring-2 focus:ring-ring"
                      aria-label="Playback speed"
                    >
                      {PLAYBACK_RATES.map(rate => (
                        <option key={rate.value} value={rate.value}>
                          {rate.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-2 w-28">
                    <Volume2 size={16} className="text-muted-foreground shrink-0" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                      aria-label="Volume"
                    />
                  </div>
                </div>

                <audio
                  ref={audioRef}
                  src={audioSrc}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handlePlaybackEnded}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
});

PracticeRoom.displayName = 'PracticeRoom';
