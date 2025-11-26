import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { SmartTabEditor } from './SmartTabEditor';
import { AlphaTabRenderer } from './AlphaTabRenderer';
import { EmptyState, ResizablePanel } from './ui';
import { useIsMobile } from '@/hooks/useBreakpoint';

interface PracticeRoomProps {
  songs: Song[];
  onNavigateToSong?: (id: string) => void;
}

export const PracticeRoom: React.FC<PracticeRoomProps> = ({ songs }) => {
  const isMobile = useIsMobile();

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

  // Sidebar toggle for song list - default to hidden on mobile
  const [showSongList, setShowSongList] = useState(!isMobile);

  const audioRef = useRef<HTMLAudioElement>(null);
  const metronomeInterval = useRef<NodeJS.Timeout | null>(null);

  const selectedSong = songs.find(s => s.id === selectedSongId);

  // Initialize state when song changes
  // This is a valid state synchronization pattern - resetting derived state when the source
  // (selectedSong) changes. Alternative would be key-based reset on parent component.
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
        // Create a quick oscillator beep
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

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Handle backing track URL loading from Data URI or Blob
  // This effect synchronizes with the browser's Blob API (external system).
  // Creating object URLs from base64 data requires cleanup (URL.revokeObjectURL),
  // making useEffect the correct pattern for this external resource management.
  const [audioSrc, setAudioSrc] = useState<string | undefined>(undefined);

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

  const activeChart = selectedSong?.charts.find(c => c.id === activeChartId);
  const isGuitarPro = activeChart?.type === 'GP';

  // Show empty state if no songs
  if (songs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <EmptyState
          icon={Music}
          title="No songs to practice"
          description="Add songs to your setlist to start practicing with charts, backing tracks, and metronome."
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100">
      {/* Top Toolbar: Song Select & Metronome */}
      <div className="h-16 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setShowSongList(!showSongList)}
            className={`p-2 rounded-lg transition-colors ${showSongList ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
            title={showSongList ? 'Hide songs' : 'Show songs'}
            aria-label={showSongList ? 'Hide songs' : 'Show songs'}
          >
            {showSongList ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
          <h2 className="font-bold text-lg flex items-center gap-2">
            {selectedSong?.title || 'Select a Song'}
            <span className="text-xs text-zinc-500 font-normal px-2 py-0.5 bg-zinc-800 rounded-full">
              {selectedSong?.bpm} BPM
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-6">
          {/* Metronome Control - Hidden if GP because GP has its own player */}
          {!isGuitarPro && (
            <div className="flex items-center gap-2 bg-zinc-950 rounded-lg p-1 border border-zinc-800">
              <button
                onClick={() => setMetronomeActive(!metronomeActive)}
                className={`p-2 rounded transition-colors ${metronomeActive ? 'bg-amber-600 text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-800'}`}
              >
                <Clock size={18} />
              </button>
              <input
                type="range"
                min="40"
                max="220"
                value={metronomeBpm}
                onChange={e => setMetronomeBpm(parseInt(e.target.value))}
                className="w-24 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs font-mono w-8 text-center">{metronomeBpm}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Songs - fixed on mobile, resizable on desktop */}
        {showSongList &&
          (isMobile ? (
            <div className="w-64 bg-zinc-900 border-r border-zinc-800 overflow-y-auto shrink-0">
              {songs.map(song => (
                <button
                  type="button"
                  key={song.id}
                  onClick={() => setSelectedSongId(song.id)}
                  className={`w-full text-left p-4 border-b border-zinc-800 hover:bg-zinc-800 transition-colors motion-reduce:transition-none ${selectedSongId === song.id ? 'bg-zinc-800 border-l-4 border-l-amber-500' : ''}`}
                >
                  <p className="font-bold text-sm truncate">{song.title}</p>
                  <p className="text-xs text-zinc-500 truncate">{song.artist}</p>
                </button>
              ))}
            </div>
          ) : (
            <ResizablePanel
              defaultWidth={256}
              minWidth={200}
              maxWidth={400}
              storageKey="practice_songlist"
              className="bg-zinc-900 border-r border-zinc-800 overflow-y-auto hidden md:block"
            >
              {songs.map(song => (
                <button
                  type="button"
                  key={song.id}
                  onClick={() => setSelectedSongId(song.id)}
                  className={`w-full text-left p-4 border-b border-zinc-800 hover:bg-zinc-800 transition-colors motion-reduce:transition-none ${selectedSongId === song.id ? 'bg-zinc-800 border-l-4 border-l-amber-500' : ''}`}
                >
                  <p className="font-bold text-sm truncate">{song.title}</p>
                  <p className="text-xs text-zinc-500 truncate">{song.artist}</p>
                </button>
              ))}
            </ResizablePanel>
          ))}

        {/* Main Stage */}
        <div className="flex-1 flex flex-col relative">
          {/* Chart Selector */}
          {selectedSong && selectedSong.charts.length > 0 && (
            <div className="bg-zinc-900/50 border-b border-zinc-800 p-2 flex gap-2 overflow-x-auto">
              {selectedSong.charts.map(chart => (
                <button
                  key={chart.id}
                  onClick={() => setActiveChartId(chart.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border transition-colors motion-reduce:transition-none ${
                    activeChartId === chart.id
                      ? 'bg-amber-600/20 border-amber-600/50 text-amber-500'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                >
                  {chart.type === 'GP' ? (
                    <Guitar size={14} />
                  ) : chart.type === 'PDF' ? (
                    <FileText size={14} />
                  ) : chart.type === 'IMAGE' ? (
                    <File size={14} />
                  ) : (
                    <Music2 size={14} />
                  )}
                  {chart.name}
                  <span className="text-[10px] bg-zinc-950 px-1.5 py-0.5 rounded-full opacity-60 ml-1">
                    {chart.instrument}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Content Viewer */}
          <div
            className={`flex-1 overflow-hidden bg-zinc-950 ${isGuitarPro ? 'p-0' : 'p-6 overflow-y-auto'}`}
          >
            {activeChart ? (
              <div
                className={`w-full h-full ${isGuitarPro ? '' : 'max-w-4xl mx-auto bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden min-h-[500px]'}`}
              >
                {activeChart.type === 'TEXT' ? (
                  <SmartTabEditor
                    content={activeChart.content || ''}
                    onChange={() => {}}
                    annotations={activeChart.annotations || []}
                    onUpdateAnnotations={() => {}}
                    readOnly={true}
                  />
                ) : activeChart.type === 'PDF' ? (
                  <iframe
                    src={activeChart.url}
                    className="w-full h-[800px] border-0"
                    title="PDF Chart Viewer"
                  />
                ) : activeChart.type === 'GP' ? (
                  <AlphaTabRenderer
                    fileData={activeChart.storageBase64 || activeChart.url!}
                    readOnly={false}
                  />
                ) : (
                  <img src={activeChart.url} alt="Chart" className="w-full h-auto" />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                <Music size={48} className="opacity-20" />
                <p>Select a chart to view or upload one in the Song Details page.</p>
              </div>
            )}
          </div>

          {/* Bottom Player Deck (Hidden if GP active) */}
          {!isGuitarPro && (
            <div className="h-24 bg-zinc-900 border-t border-zinc-800 flex items-center px-6 gap-6 shrink-0 z-20">
              {/* Playback Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    if (audioRef.current) audioRef.current.currentTime -= 5;
                  }}
                  className="text-zinc-400 hover:text-white"
                  aria-label="Rewind 5 seconds"
                >
                  <Rewind size={20} />
                </button>
                <button
                  onClick={togglePlay}
                  disabled={!audioSrc}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all ${audioSrc ? 'bg-amber-600 hover:bg-amber-700 shadow-lg hover:scale-105' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                </button>
                <button
                  onClick={() => {
                    if (audioRef.current) audioRef.current.currentTime += 5;
                  }}
                  className="text-zinc-400 hover:text-white"
                  aria-label="Forward 5 seconds"
                >
                  <FastForward size={20} />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="flex-1 flex flex-col justify-center gap-1">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500"
                />
                <div className="flex justify-between text-xs font-mono text-zinc-500">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Speed & Volume */}
              <div className="flex items-center gap-6">
                {/* Speed */}
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-xs font-bold text-zinc-500 uppercase">
                    <Gauge size={12} /> Speed
                  </div>
                  <select
                    value={playbackRate}
                    onChange={e => setPlaybackRate(parseFloat(e.target.value))}
                    className="bg-zinc-800 text-white text-xs rounded px-2 py-1 border border-zinc-700 outline-none"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="0.75">0.75x</option>
                    <option value="1.0">1.0x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                  </select>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-2 w-32">
                  <Volume2 size={16} className="text-zinc-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={e => setVolume(parseFloat(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <audio
                ref={audioRef}
                src={audioSrc}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
