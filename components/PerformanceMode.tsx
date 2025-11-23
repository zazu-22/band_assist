
import React, { useState, useEffect, useRef } from 'react';
import { Song, SongChart } from '../types';
import { X, ChevronLeft, ChevronRight, Play, Pause, Timer, Music2, FileText, File, Guitar, ArrowUp, ArrowDown, Scroll, Gauge } from 'lucide-react';
import { SmartTabEditor } from './SmartTabEditor';
import { AlphaTabRenderer } from './AlphaTabRenderer';

interface PerformanceModeProps {
  songs: Song[];
  onExit: () => void;
}

export const PerformanceMode: React.FC<PerformanceModeProps> = ({ songs, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [tick, setTick] = useState(false); // Visual tick for metronome

  // Chart state
  const currentSong = songs[currentIndex];
  const [activeChartId, setActiveChartId] = useState<string | null>(
      currentSong.charts.length > 0 ? currentSong.charts[0].id : null
  );

  // Auto-scroll state
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1.0); // Multiplier for scroll speed
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
      // Reset active chart when song changes
      if (currentSong.charts.length > 0) {
          setActiveChartId(currentSong.charts[0].id);
      } else {
          setActiveChartId(null);
      }
  }, [currentSong]);
  
  const activeChart = currentSong.charts.find(c => c.id === activeChartId);
  const isGuitarPro = activeChart?.type === 'GP';

  // Gig Timer
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Metronome Logic (Skip if GP file is active as it has its own player)
  useEffect(() => {
    let interval: any;
    if (metronomeActive && currentSong.bpm && !isGuitarPro) {
      const msPerBeat = 60000 / currentSong.bpm;
      interval = setInterval(() => {
        setTick(prev => !prev);
      }, msPerBeat);
    } else {
        setTick(false);
    }
    return () => clearInterval(interval);
  }, [metronomeActive, currentSong.bpm, isGuitarPro]);

  // Auto-scroll Logic (Only for TEXT, PDF, IMAGE charts - GP has its own scrolling)
  useEffect(() => {
    if (!autoScrollEnabled || isGuitarPro || !scrollContainerRef.current) {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }
      return;
    }

    // Calculate scroll speed based on BPM
    // Base speed: 1 pixel per 16ms at 120 BPM (roughly 60px/second)
    // Adjust based on actual BPM and user speed multiplier
    const baseBPM = 120;
    const bpmFactor = currentSong.bpm ? currentSong.bpm / baseBPM : 1;
    const pixelsPerFrame = 1 * bpmFactor * scrollSpeed;

    const animate = (currentTime: number) => {
      if (!scrollContainerRef.current) return;

      const deltaTime = currentTime - lastScrollTimeRef.current;

      // Throttle to ~60fps
      if (deltaTime >= 16) {
        scrollContainerRef.current.scrollTop += pixelsPerFrame;
        lastScrollTimeRef.current = currentTime;
      }

      autoScrollRef.current = requestAnimationFrame(animate);
    };

    lastScrollTimeRef.current = performance.now();
    autoScrollRef.current = requestAnimationFrame(animate);

    return () => {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }
    };
  }, [autoScrollEnabled, currentSong.bpm, scrollSpeed, isGuitarPro]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Manual scroll functions
  const scrollBy = (amount: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: amount, behavior: 'smooth' });
      // Temporarily pause auto-scroll on manual scroll
      if (autoScrollEnabled) {
        setAutoScrollEnabled(false);
      }
    }
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Detect user scroll and pause auto-scroll
  const handleUserScroll = () => {
    if (!autoScrollEnabled) return;

    // Clear existing timeout
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }

    // Pause auto-scroll
    setAutoScrollEnabled(false);
  };

  const nextSong = () => {
    if (currentIndex < songs.length - 1) {
      setCurrentIndex(prev => prev + 1);
      // Reset scroll position and auto-scroll when changing songs
      setAutoScrollEnabled(false);
      setTimeout(() => scrollToTop(), 100);
    }
  };

  const prevSong = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      // Reset scroll position and auto-scroll when changing songs
      setAutoScrollEnabled(false);
      setTimeout(() => scrollToTop(), 100);
    }
  };

  // Handle Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight' && !e.ctrlKey) nextSong();
        if (e.key === 'ArrowLeft' && !e.ctrlKey) prevSong();
        if (e.key === ' ' && !isGuitarPro) {
          e.preventDefault();
          setIsPlaying(prev => !prev);
        }
        // Scroll controls (only for non-GP charts)
        if (!isGuitarPro) {
          if (e.key === 'ArrowUp' && e.ctrlKey) {
            e.preventDefault();
            scrollBy(-100);
          }
          if (e.key === 'ArrowDown' && e.ctrlKey) {
            e.preventDefault();
            scrollBy(100);
          }
          if (e.key === 'PageUp') {
            e.preventDefault();
            scrollBy(-500);
          }
          if (e.key === 'PageDown') {
            e.preventDefault();
            scrollBy(500);
          }
          if (e.key === 'Home') {
            e.preventDefault();
            scrollToTop();
          }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, songs.length, isGuitarPro, autoScrollEnabled]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col text-white">
      {/* Top Bar: Status & Timer */}
      <header className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
            <button 
                onClick={onExit}
                className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
            >
                <X size={24} />
            </button>
            <div className="flex items-baseline gap-2">
                <span className="text-zinc-500 text-sm font-mono uppercase">Song {currentIndex + 1}/{songs.length}</span>
                <h1 className="text-xl font-bold text-white truncate max-w-[300px]">{currentSong.title}</h1>
            </div>
        </div>

        <div className="flex items-center gap-6">
            {/* Auto-Scroll Controls (Only for TEXT, PDF, IMAGE charts) */}
            {!isGuitarPro && (
                <>
                <div className="flex items-center gap-2 bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-800">
                    <button
                        onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold transition-colors ${autoScrollEnabled ? 'bg-amber-600 border-amber-500 text-white' : 'border-zinc-700 text-zinc-400 hover:text-white'}`}
                        title="Toggle auto-scroll"
                    >
                        <Scroll size={16} /> Auto
                    </button>
                    <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
                        <Gauge size={14} className="text-zinc-500" />
                        <input
                            type="range"
                            min="0.25"
                            max="2.0"
                            step="0.25"
                            value={scrollSpeed}
                            onChange={(e) => setScrollSpeed(parseFloat(e.target.value))}
                            className="w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            title="Scroll speed"
                        />
                        <span className="text-xs font-mono text-zinc-400 w-8">{scrollSpeed}x</span>
                    </div>
                </div>

                {/* Metronome Indicator */}
                <div
                    className={`w-4 h-4 rounded-full transition-colors duration-75 ${tick ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'bg-zinc-800'}`}
                ></div>
                <button
                    onClick={() => setMetronomeActive(!metronomeActive)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold ${metronomeActive ? 'bg-zinc-800 border-zinc-700 text-amber-500' : 'border-zinc-800 text-zinc-500'}`}
                >
                    <Music2 size={16} /> {currentSong.bpm} BPM
                </button>
                </>
            )}

            {/* Gig Timer */}
            <div className="flex items-center gap-4 bg-zinc-950 px-4 py-2 rounded-lg border border-zinc-800">
                <Timer size={18} className={isPlaying ? 'text-green-500' : 'text-zinc-500'} />
                <span className={`text-2xl font-mono font-bold ${isPlaying ? 'text-white' : 'text-zinc-500'}`}>
                    {formatTime(elapsedTime)}
                </span>
                <button onClick={() => setIsPlaying(!isPlaying)} className="text-zinc-400 hover:text-white">
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
            </div>
        </div>
      </header>

      {/* Main Stage View */}
      <div className="flex-1 flex flex-col min-h-0">
         
         {/* Chart Selector Bar for Live Mode */}
         {currentSong.charts.length > 1 && (
            <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-2 flex gap-2 overflow-x-auto">
                {currentSong.charts.map(chart => (
                    <button
                        key={chart.id}
                        onClick={() => setActiveChartId(chart.id)}
                        className={`px-3 py-1 text-sm font-bold rounded-full border flex items-center gap-2 ${
                            activeChartId === chart.id 
                            ? 'bg-amber-600 text-white border-amber-500' 
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}
                    >
                        {chart.type === 'GP' && <Guitar size={12} />}
                        {chart.name}
                    </button>
                ))}
            </div>
         )}

         {/* Teleprompter / Chart Area */}
         <div
            ref={scrollContainerRef}
            onScroll={handleUserScroll}
            className={`flex-1 min-h-0 bg-black ${isGuitarPro ? 'overflow-hidden' : 'p-4 lg:p-8 overflow-y-auto'} relative`}
         >
            <div className={`${isGuitarPro ? 'h-full w-full' : 'max-w-4xl mx-auto'}`}>
                {/* Song Key Info Header for Stage (Only show if not using full screen GP) */}
                {!isGuitarPro && (
                    <div className="flex items-center justify-between mb-8 p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                        <div>
                            <p className="text-zinc-500 text-sm uppercase tracking-widest mb-1">Next Up</p>
                            <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight">{currentSong.title}</h2>
                        </div>
                        <div className="text-right">
                            <div className="inline-flex flex-col items-center justify-center bg-zinc-800 w-24 h-24 rounded-xl border-2 border-zinc-700">
                                <span className="text-zinc-400 text-xs uppercase font-bold">Key</span>
                                <span className="text-4xl font-bold text-amber-500">{currentSong.key}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Chart Content */}
                <div className={`${isGuitarPro ? 'h-full bg-white' : 'text-lg md:text-xl min-h-[500px] rounded-xl overflow-hidden bg-zinc-900/20 border border-zinc-800/50'}`}>
                    {activeChart ? (
                        activeChart.type === 'TEXT' ? (
                             <div className="p-4">
                                <SmartTabEditor 
                                    content={activeChart.content || ""}
                                    onChange={() => {}}
                                    annotations={activeChart.annotations || []}
                                    onUpdateAnnotations={() => {}}
                                    readOnly={true}
                                />
                             </div>
                        ) : activeChart.type === 'PDF' ? (
                            <iframe
                                src={activeChart.url}
                                className="w-full h-[80vh] border-0"
                                title="PDF Chart Viewer"
                            />
                        ) : activeChart.type === 'GP' ? (
                            <AlphaTabRenderer fileData={activeChart.url!} readOnly={true} />
                        ) : (
                             <img src={activeChart.url} alt="Chart" className="w-full h-auto" />
                        )
                    ) : (
                        <div className="flex items-center justify-center h-64 text-zinc-500">
                            <p>No chart selected or available for this song.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Manual Scroll Controls (Only for non-GP charts) */}
            {!isGuitarPro && (
                <div className="fixed right-8 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
                    <button
                        onClick={() => scrollBy(-200)}
                        className="w-12 h-12 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg"
                        title="Scroll up (or use Page Up)"
                    >
                        <ArrowUp size={20} />
                    </button>
                    <button
                        onClick={() => scrollToTop()}
                        className="w-12 h-12 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-white transition-all hover:scale-110 shadow-lg"
                        title="Scroll to top (or use Home)"
                    >
                        TOP
                    </button>
                    <button
                        onClick={() => scrollBy(200)}
                        className="w-12 h-12 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg"
                        title="Scroll down (or use Page Down)"
                    >
                        <ArrowDown size={20} />
                    </button>
                </div>
            )}
         </div>
      </div>

      {/* Bottom Navigation Control */}
      <footer className="h-24 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between px-4 md:px-10 shrink-0">
            <button 
                onClick={prevSong}
                disabled={currentIndex === 0}
                className="flex items-center gap-4 px-8 py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
            >
                <ChevronLeft size={32} />
                <span className="text-xl font-bold hidden md:inline">Previous</span>
            </button>

            <div className="flex flex-col items-center">
                <span className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Next Song</span>
                <span className="text-lg font-bold text-zinc-300">
                    {currentIndex < songs.length - 1 ? songs[currentIndex + 1].title : 'End of Set'}
                </span>
            </div>

            <button 
                onClick={nextSong}
                disabled={currentIndex === songs.length - 1}
                className="flex items-center gap-4 px-8 py-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-amber-900/20"
            >
                <span className="text-xl font-bold hidden md:inline">Next Song</span>
                <ChevronRight size={32} />
            </button>
      </footer>
    </div>
  );
};