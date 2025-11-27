import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { Song } from '@/types';
import {
  Play,
  Pause,
  Rewind,
  FastForward,
  Volume2,
  Music,
  Gauge,
  FileText,
  File,
  Music2,
  Clock,
  Guitar,
  PanelLeftClose,
  PanelLeftOpen,
  ListMusic,
} from 'lucide-react';
import { SmartTabEditor } from './SmartTabEditor';
import { AlphaTabRenderer } from './AlphaTabRenderer';
import { EmptyState, ResizablePanel, StatusBadge } from './ui';
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
import { useIsMobile } from '@/hooks/useBreakpoint';

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

const CHART_ICON_MAP = {
  GP: Guitar,
  PDF: FileText,
  IMAGE: File,
  TEXT: Music2,
} as const;

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

const SongListItem = memo(function SongListItem({
  song,
  isSelected,
  onSelect,
}: SongListItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(song.id)}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-border/30',
        'hover:bg-muted/30 transition-colors motion-reduce:transition-none',
        isSelected && 'bg-muted/50 border-l-[3px] border-l-primary'
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

interface ChartTabProps {
  chart: Song['charts'][0];
  isActive: boolean;
  onSelect: (id: string) => void;
}

const ChartTab = memo(function ChartTab({ chart, isActive, onSelect }: ChartTabProps) {
  const Icon = CHART_ICON_MAP[chart.type];
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => onSelect(chart.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium',
              'flex items-center gap-2 border transition-colors motion-reduce:transition-none',
              isActive
                ? 'bg-primary/20 border-primary/50 text-primary'
                : 'bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-muted/80'
            )}
          >
            <Icon size={14} />
            <span className="truncate max-w-[120px]">{chart.name}</span>
            {chart.instrument && (
              <span className="text-[10px] bg-background/50 px-1.5 py-0.5 rounded-full opacity-70 ml-1">
                {chart.instrument}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {chart.name} ({chart.type})
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

ChartTab.displayName = 'ChartTab';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PracticeRoom: React.FC<PracticeRoomProps> = memo(function PracticeRoom({
  songs,
}) {
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
  const [metronomeBpm, setMetronomeBpm] = useState(120);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [activeChartId, setActiveChartId] = useState<string | null>(null);
  const [showSongList, setShowSongList] = useState(!isMobile);
  const [audioSrc, setAudioSrc] = useState<string | undefined>(undefined);

  // ---------------------------------------------------------------------------
  // REFS
  // ---------------------------------------------------------------------------

  const audioRef = useRef<HTMLAudioElement>(null);
  const metronomeInterval = useRef<NodeJS.Timeout | null>(null);

  // ---------------------------------------------------------------------------
  // MEMOIZED VALUES
  // ---------------------------------------------------------------------------

  const selectedSong = useMemo(
    () => songs.find(s => s.id === selectedSongId),
    [songs, selectedSongId]
  );

  const activeChart = useMemo(
    () => selectedSong?.charts.find(c => c.id === activeChartId),
    [selectedSong, activeChartId]
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

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Initialize state when song changes
  useEffect(() => {
    if (selectedSong) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting derived state when song prop changes
      setMetronomeBpm(selectedSong.bpm);
      if (selectedSong.charts.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting derived state when song prop changes
        setActiveChartId(selectedSong.charts[0].id);
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting derived state when song prop changes
        setActiveChartId(null);
      }
    }
  }, [selectedSongId, selectedSong]);

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
      const ms = 60000 / metronomeBpm;
      metronomeInterval.current = setInterval(() => {
        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
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

  // Handle backing track URL loading from Data URI or Blob
  useEffect(() => {
    if (selectedSong?.backingTrackUrl && selectedSong.backingTrackUrl.startsWith('data:audio')) {
      try {
        const mime = selectedSong.backingTrackUrl.split(';')[0].split(':')[1];
        const base64 = selectedSong.backingTrackUrl.split(',')[1];
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });
        const url = URL.createObjectURL(blob);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronizing with browser Blob API; cleanup handled in return
        setAudioSrc(url);
        return () => URL.revokeObjectURL(url);
      } catch {
        // Silently handle conversion errors
      }
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clearing external resource reference
      setAudioSrc(undefined);
    }
  }, [selectedSong]);

  // ---------------------------------------------------------------------------
  // CALLBACKS
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

  const handleSongSelect = useCallback((id: string) => {
    setSelectedSongId(id);
    // Auto-hide song list on mobile after selection
    if (isMobile) {
      setShowSongList(false);
    }
  }, [isMobile]);

  const handleChartSelect = useCallback((id: string) => {
    setActiveChartId(id);
  }, []);

  const toggleSongList = useCallback(() => {
    setShowSongList(prev => !prev);
  }, []);

  const toggleMetronome = useCallback(() => {
    setMetronomeActive(prev => !prev);
  }, []);

  const handleMetronomeBpmChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMetronomeBpm(parseInt(e.target.value));
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
      {/* Header Toolbar */}
      <header className="border-b border-border bg-card px-4 py-3 shrink-0">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Toggle + Song Title */}
          <div className="flex items-center gap-3 min-w-0">
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSongList}
                    className={cn(
                      'h-9 w-9 p-0',
                      showSongList && 'bg-muted'
                    )}
                    aria-label={showSongList ? 'Hide song list' : 'Show song list'}
                  >
                    {showSongList ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{showSongList ? 'Hide song list' : 'Show song list'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="min-w-0">
              <h2 className="text-lg font-bold font-serif text-foreground truncate">
                {selectedSong?.title || 'Select a Song'}
              </h2>
              {selectedSong && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">{selectedSong.bpm} BPM</span>
                  {selectedSong.key && (
                    <>
                      <span className="text-border">•</span>
                      <span>Key of {selectedSong.key}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Metronome Control */}
          {!isGuitarPro && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1 border border-border">
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={toggleMetronome}
                        className={cn(
                          'p-2 rounded-md transition-colors',
                          metronomeActive
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'text-muted-foreground hover:bg-background hover:text-foreground'
                        )}
                        aria-label={metronomeActive ? 'Stop metronome' : 'Start metronome'}
                      >
                        <Clock size={18} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{metronomeActive ? 'Stop metronome' : 'Start metronome'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <input
                  type="range"
                  min="40"
                  max="220"
                  value={metronomeBpm}
                  onChange={handleMetronomeBpmChange}
                  className="w-20 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                  aria-label="Metronome BPM"
                />
                <span className="text-xs font-mono w-8 text-center tabular-nums text-foreground">
                  {metronomeBpm}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Song List */}
        {showSongList && (
          isMobile ? (
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
          )
        )}

        {/* Main Stage */}
        <div className="flex-1 flex flex-col relative min-w-0">
          {/* Chart Selector */}
          {selectedSong && selectedSong.charts.length > 0 && (
            <div className="bg-muted/30 border-b border-border p-2 flex gap-2 overflow-x-auto shrink-0 animate-fade-in">
              {selectedSong.charts.map(chart => (
                <ChartTab
                  key={chart.id}
                  chart={chart}
                  isActive={activeChartId === chart.id}
                  onSelect={handleChartSelect}
                />
              ))}
            </div>
          )}

          {/* Content Viewer */}
          <div
            className={cn(
              'flex-1 overflow-hidden bg-background',
              isGuitarPro ? 'p-0' : 'p-4 sm:p-6 overflow-y-auto'
            )}
          >
            {activeChart ? (
              <div
                className={cn(
                  'w-full h-full',
                  !isGuitarPro && 'max-w-4xl mx-auto'
                )}
              >
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
                  <AlphaTabRenderer
                    fileData={activeChart.storageBase64 || activeChart.url!}
                    readOnly={false}
                  />
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

          {/* Bottom Player Deck (Hidden if GP active - GP has its own player) */}
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
