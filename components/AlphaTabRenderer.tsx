
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Play, Pause, Square, Sliders, Layers, Activity, Music2, AlertTriangle, Repeat, X } from 'lucide-react';

// Constants
const POSITION_UPDATE_THROTTLE_MS = 100; // Throttle position updates to ~10 FPS for performance
const METRONOME_HIGHLIGHT_DURATION_FACTOR = 0.3; // Duration factor for metronome beat highlight

// AlphaTab type definitions
interface AlphaTabScore {
  tracks: AlphaTabTrack[];
}

interface AlphaTabTrack {
  name: string;
  playbackInfo: {
    isMute: boolean;
    isSolo: boolean;
  };
}

interface AlphaTabPlayerStateChangedEvent {
  state: number; // 0 = paused, 1 = playing
}

interface AlphaTabPositionChangedEvent {
  currentTime: number;
  endTime: number;
}

interface AlphaTabBeatMouseEvent {
  beat: {
    absolutePlaybackStart: number;
    playbackDuration: number;
  };
  originalEvent: {
    shiftKey: boolean;
  };
}

interface AlphaTabMidiEvent {
  isMetronome: boolean;
  metronomeNumerator: number;
  metronomeDurationInMilliseconds: number;
}

interface AlphaTabMidiEventsPlayedEvent {
  events: AlphaTabMidiEvent[];
}

interface AlphaTabErrorEvent {
  message?: string;
  inner?: string;
}

interface AlphaTabApi {
  destroy(): void;
  load(data: Uint8Array): void;
  play(): void;
  pause(): void;
  playPause(): void;
  stop(): void;
  renderTracks(tracks: AlphaTabTrack[]): void;
  changeTrackMute(tracks: AlphaTabTrack[], mute: boolean): void;
  changeTrackSolo(tracks: AlphaTabTrack[], solo: boolean): void;
  playbackSpeed: number;
  timePosition: number;
  isLooping: boolean;
  playbackRange: { startTick: number; endTick: number } | null;
  score: AlphaTabScore;
  scoreLoaded: { on(callback: (score: AlphaTabScore) => void): void; off(callback: (score: AlphaTabScore) => void): void };
  error: { on(callback: (e: AlphaTabErrorEvent) => void): void; off(callback: (e: AlphaTabErrorEvent) => void): void };
  playerStateChanged: { on(callback: (args: AlphaTabPlayerStateChangedEvent) => void): void; off(callback: (args: AlphaTabPlayerStateChangedEvent) => void): void };
  playerReady: { on(callback: () => void): void; off(callback: () => void): void };
  renderStarted: { on(callback: () => void): void; off(callback: () => void): void };
  renderFinished: { on(callback: () => void): void; off(callback: () => void): void };
  playerPositionChanged: { on(callback: (e: AlphaTabPositionChangedEvent) => void): void; off(callback: (e: AlphaTabPositionChangedEvent) => void): void };
  playerFinished: { on(callback: () => void): void; off(callback: () => void): void };
  beatMouseDown: { on(callback: (e: AlphaTabBeatMouseEvent) => void): void; off(callback: (e: AlphaTabBeatMouseEvent) => void): void };
  midiEventsPlayed: { on(callback: (e: AlphaTabMidiEventsPlayedEvent) => void): void; off(callback: (e: AlphaTabMidiEventsPlayedEvent) => void): void };
  midiEventsPlayedFilter: number[];
}

// Extend window interface to include alphaTab from CDN
declare global {
  interface Window {
    alphaTab: {
      AlphaTabApi: new (element: HTMLElement, settings: any) => AlphaTabApi;
      midi: {
        MidiEventType: {
          AlphaTabMetronome: number;
        };
      };
    };
  }
}

interface AlphaTabRendererProps {
  fileData: string; // Base64 Data URI
  isPlaying?: boolean;
  onPlaybackChange?: (isPlaying: boolean) => void;
  readOnly?: boolean;
}

export const AlphaTabRenderer: React.FC<AlphaTabRendererProps> = ({ 
  fileData, 
  isPlaying: externalIsPlaying,
  onPlaybackChange,
  readOnly = false
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<AlphaTabApi | null>(null);
  const metronomeTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const cleanupEventListenersRef = useRef<(() => void) | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<AlphaTabTrack[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState(1.0);
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Phase 1: Transport controls state
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [loopRange, setLoopRange] = useState<{start: number, end: number} | null>(null);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);

  // Phase 2: Visual feedback state
  const [metronomeBeat, setMetronomeBeat] = useState<number>(0);

  // Helper to convert Base64 DataURI to Uint8Array
  const prepareData = (uri: string): Uint8Array | null => {
    try {
      // Check if it's a data URI
      if (uri.indexOf('base64,') > -1) {
        const base64 = uri.split('base64,')[1];
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      }
      return null;
    } catch (e) {
      console.error("Error converting base64 to binary", e);
      return null;
    }
  };

  // Initialize AlphaTab
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let checkAttempts = 0;
    const MAX_CHECK_ATTEMPTS = 50; // 10 seconds

    // Wait for AlphaTab CDN script to load
    const checkLibrary = () => {
      checkAttempts++;
      if (!window.alphaTab) {
        if (checkAttempts >= MAX_CHECK_ATTEMPTS) {
          if (isMounted) {
            setError("AlphaTab library failed to load from CDN. Please check your internet connection.");
            setLoading(false);
          }
          return;
        }
        setTimeout(checkLibrary, 200);
        return;
      }
      initAlphaTab();
    };

    const initAlphaTab = () => {
      if (!containerRef.current || !isMounted) return;

      // Cleanup existing
      if (apiRef.current) {
        try {
          apiRef.current.destroy();
        } catch (e) {
          console.error("[AlphaTab] Error destroying previous instance", e);
        }
        apiRef.current = null;
      }

      setLoading(true);
      setError(null);

      // Set a timeout for loading
      timeoutId = setTimeout(() => {
        if (isMounted && loading) {
          setError("Loading timeout. The file may be too large, corrupted, or incompatible with this environment.");
          setLoading(false);
        }
      }, 15000); // 15 second timeout

      try {
        // 2. Configure Settings
        const settings: any = {
          core: {
            fontDirectory: '/font/', // Use locally served Bravura fonts
            includeNoteBounds: false,
            useWorkers: true // CDN version can use workers
          },
          player: {
            enablePlayer: !readOnly, // Disable player in readonly mode
            soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2',
            scrollElement: rootRef.current
          },
          display: {
            layoutMode: 'page', // Always use page layout for better readability
            staveProfile: 'Default'
          }
        };

        // 3. Initialize API
        console.log("[AlphaTab] Initializing API...");
        const api = new window.alphaTab.AlphaTabApi(containerRef.current, settings);
        apiRef.current = api;

        // 4. Attach Events - Store handlers for cleanup
        const handleScoreLoaded = (score: AlphaTabScore) => {
          if(!isMounted) return;
          console.log("[AlphaTab] Score Loaded Successfully", score);
          clearTimeout(timeoutId);
          setTracks(score.tracks);
          setLoading(false);
        };

        const handleError = (e: AlphaTabErrorEvent) => {
          if(!isMounted) return;
          console.error("[AlphaTab] Error Event:", e);
          clearTimeout(timeoutId);

          // Provide more specific error messages
          let errorMsg = "Failed to load Guitar Pro file.";
          if (e?.message) {
            errorMsg += ` ${e.message}`;
          }
          if (e?.inner) {
            errorMsg += ` Details: ${e.inner}`;
          }
          errorMsg += " The file may be corrupted, an unsupported version, or incompatible with this environment.";

          setError(errorMsg);
          setLoading(false);
        };

        const handlePlayerStateChanged = (args: AlphaTabPlayerStateChangedEvent) => {
          if(!isMounted) return;
          const playing = args.state === 1;
          setInternalIsPlaying(playing);
          if (onPlaybackChange) onPlaybackChange(playing);
        };

        const handlePlayerReady = () => {
          if(!isMounted) return;
          console.log("[AlphaTab] Player Ready");
        };

        const handleRenderStarted = () => {
          if(!isMounted) return;
          console.log("[AlphaTab] Rendering started...");
        };

        const handleRenderFinished = () => {
          if(!isMounted) return;
          console.log("[AlphaTab] Rendering finished");
        };

        // Phase 1: Position tracking and playback events
        let lastPositionUpdate = 0;
        const handlePositionChanged = (e: AlphaTabPositionChangedEvent) => {
          if (!isMounted) return;

          // Throttle updates for performance
          const now = Date.now();
          if (now - lastPositionUpdate < POSITION_UPDATE_THROTTLE_MS) return;
          lastPositionUpdate = now;

          setCurrentTime(e.currentTime);
          setTotalTime(e.endTime);
        };

        const handlePlayerFinished = () => {
          if (!isMounted) return;
          console.log("[AlphaTab] Playback finished");
          setInternalIsPlaying(false);
          if (onPlaybackChange) onPlaybackChange(false);
        };

        // Phase 1: Beat selection for loop - capture ref outside state setter to avoid stale closure
        const handleBeatMouseDown = (e: AlphaTabBeatMouseEvent) => {
          if (!isMounted) return;

          // Shift+Click to set loop range
          if (e.originalEvent.shiftKey) {
            const beatStart = e.beat.absolutePlaybackStart;
            const beatEnd = beatStart + e.beat.playbackDuration;
            const api = apiRef.current; // Capture ref value outside state setter

            setSelectionStart((currentStart) => {
              if (currentStart === null) {
                // First click - set start point
                console.log("[AlphaTab] Loop start set:", beatStart);
                return beatStart;
              } else {
                // Second click - create range
                const startTick = Math.min(currentStart, beatStart);
                const endTick = Math.max(currentStart + e.beat.playbackDuration, beatEnd);

                if (api) {
                  api.playbackRange = { startTick, endTick };
                }
                setLoopRange({ start: startTick, end: endTick });

                console.log("[AlphaTab] Loop range set:", startTick, "-", endTick);
                return null;
              }
            });
          }
        };

        // Phase 2: Visual metronome
        api.midiEventsPlayedFilter = [
          window.alphaTab.midi.MidiEventType.AlphaTabMetronome
        ];

        const handleMidiEventsPlayed = (e: AlphaTabMidiEventsPlayedEvent) => {
          if (!isMounted) return;

          for (const midi of e.events) {
            if (midi.isMetronome) {
              setMetronomeBeat(midi.metronomeNumerator);

              // Auto-clear highlight after beat duration - track timeout for cleanup
              const timeoutId = setTimeout(() => {
                if (!isMounted) return;
                metronomeTimeoutsRef.current.delete(timeoutId);
                setMetronomeBeat(0);
              }, midi.metronomeDurationInMilliseconds * METRONOME_HIGHLIGHT_DURATION_FACTOR);

              metronomeTimeoutsRef.current.add(timeoutId);
            }
          }
        };

        // Register all event handlers
        api.scoreLoaded.on(handleScoreLoaded);
        api.error.on(handleError);
        api.playerStateChanged.on(handlePlayerStateChanged);
        api.playerReady.on(handlePlayerReady);
        api.renderStarted.on(handleRenderStarted);
        api.renderFinished.on(handleRenderFinished);
        api.playerPositionChanged.on(handlePositionChanged);
        api.playerFinished.on(handlePlayerFinished);
        api.beatMouseDown.on(handleBeatMouseDown);
        api.midiEventsPlayed.on(handleMidiEventsPlayed);

        // Store cleanup function in ref for cleanup phase
        cleanupEventListenersRef.current = () => {
          if (api) {
            api.scoreLoaded.off(handleScoreLoaded);
            api.error.off(handleError);
            api.playerStateChanged.off(handlePlayerStateChanged);
            api.playerReady.off(handlePlayerReady);
            api.renderStarted.off(handleRenderStarted);
            api.renderFinished.off(handleRenderFinished);
            api.playerPositionChanged.off(handlePositionChanged);
            api.playerFinished.off(handlePlayerFinished);
            api.beatMouseDown.off(handleBeatMouseDown);
            api.midiEventsPlayed.off(handleMidiEventsPlayed);
          }
        };

        // 5. Load Data
        const data = prepareData(fileData);
        if (data) {
          console.log("[AlphaTab] Loading Binary Data...", data.length, "bytes");
          console.log("[AlphaTab] First few bytes:", Array.from(data.slice(0, 10)));
          api.load(data);
        } else {
          clearTimeout(timeoutId);
          console.error("[AlphaTab] Data preparation failed");
          setError("Invalid file data format. Could not convert Base64 to binary.");
          setLoading(false);
        }

      } catch (e: any) {
        console.error("[AlphaTab] Setup Exception", e);
        clearTimeout(timeoutId);
        setError(`Initialization error: ${e.message || "Unknown error"}. This might be an environment compatibility issue.`);
        setLoading(false);
      }
    };

    checkLibrary();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);

      // Clear all metronome timeouts
      metronomeTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      metronomeTimeoutsRef.current.clear();

      if (apiRef.current) {
        try {
          // Explicitly cleanup event listeners before destroying
          if (cleanupEventListenersRef.current) {
            cleanupEventListenersRef.current();
          }
          apiRef.current.destroy();
        } catch (e) {
          console.error("[AlphaTab] Error during cleanup", e);
        }
      }
    };
  }, [fileData, readOnly, retryKey]);

  // External Playback Sync
  useEffect(() => {
    if (!apiRef.current) return;
    
    if (externalIsPlaying && !internalIsPlaying) {
      apiRef.current.play();
    } else if (!externalIsPlaying && internalIsPlaying) {
      apiRef.current.pause();
    }
  }, [externalIsPlaying]);

  const togglePlay = () => {
    if (apiRef.current) apiRef.current.playPause();
  };

  const changeSpeed = (val: number) => {
     if(apiRef.current) {
         apiRef.current.playbackSpeed = val;
         setCurrentSpeed(val);
     }
  };

  const renderTrack = (track: any) => {
     if(apiRef.current) apiRef.current.renderTracks([track]);
  };

  const toggleTrackMute = (track: any) => {
      if(apiRef.current) {
          apiRef.current.changeTrackMute([track], !track.playbackInfo.isMute);
          setTracks([...apiRef.current.score.tracks]);
      }
  };

  const toggleTrackSolo = (track: any) => {
      if(apiRef.current) {
          apiRef.current.changeTrackSolo([track], !track.playbackInfo.isSolo);
          setTracks([...apiRef.current.score.tracks]);
      }
  };

  // New transport control handlers
  const stopPlayback = () => {
    if (apiRef.current) {
      apiRef.current.stop();
      setInternalIsPlaying(false);
      if (onPlaybackChange) onPlaybackChange(false);
    }
  };

  const seekTo = (percentage: number) => {
    if (!apiRef.current || totalTime <= 0) return;

    try {
      const targetTime = totalTime * percentage;
      if (isNaN(targetTime) || targetTime < 0 || targetTime > totalTime) {
        console.error("[AlphaTab] Invalid seek time:", targetTime);
        return;
      }
      apiRef.current.timePosition = targetTime;
    } catch (error) {
      console.error("[AlphaTab] Error seeking to position:", error);
    }
  };

  const toggleLoop = () => {
    if (apiRef.current) {
      const newLooping = !isLooping;
      apiRef.current.isLooping = newLooping;
      setIsLooping(newLooping);
    }
  };

  const clearLoopRange = () => {
    if (apiRef.current) {
      apiRef.current.playbackRange = null;
      setLoopRange(null);
      setSelectionStart(null);
    }
  };

  // Helper for time formatting - memoized to prevent re-creation
  const formatTime = useCallback((milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Memoize formatted times to reduce string operations
  const formattedCurrentTime = useMemo(() => formatTime(currentTime), [currentTime, formatTime]);
  const formattedTotalTime = useMemo(() => formatTime(totalTime), [totalTime, formatTime]);
  const progressPercentage = useMemo(() =>
    totalTime > 0 ? (currentTime / totalTime) * 100 : 0,
    [currentTime, totalTime]
  );

  return (
    <div className="flex flex-col h-full bg-white text-black rounded-xl overflow-hidden relative border border-zinc-200">
      {/* Toolbar */}
      <div className="bg-zinc-100 border-b border-zinc-300 p-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
            {!readOnly && (
                <>
                  <button
                      onClick={togglePlay}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${internalIsPlaying ? 'bg-amber-500 text-white' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'}`}
                  >
                      {internalIsPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                  </button>

                  {/* Stop button */}
                  <button
                    onClick={stopPlayback}
                    disabled={!internalIsPlaying && currentTime === 0}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-200 hover:bg-zinc-300 text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Stop and return to start"
                  >
                    <Square size={18} />
                  </button>
                </>
            )}

            {/* Speed control */}
            <div className="flex items-center gap-1 bg-zinc-200 rounded px-2 py-1">
                <Activity size={14} className="text-zinc-500" />
                <select
                    value={currentSpeed}
                    onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                    className="bg-transparent text-sm outline-none w-16"
                >
                    <option value="0.5">50%</option>
                    <option value="0.75">75%</option>
                    <option value="1.0">100%</option>
                    <option value="1.25">125%</option>
                </select>
            </div>

            {/* Loop controls */}
            {!readOnly && (
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleLoop}
                  className={`p-2 rounded transition-colors ${
                    isLooping ? 'bg-amber-500 text-white' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                  }`}
                  title="Toggle loop"
                >
                  <Repeat size={16} />
                </button>

                {loopRange && (
                  <button
                    onClick={clearLoopRange}
                    className="p-2 rounded bg-zinc-200 hover:bg-red-200 text-zinc-700 hover:text-red-600 transition-colors"
                    title="Clear loop range"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}

            {/* Visual metronome */}
            {!readOnly && (
              <div className="flex items-center gap-1 bg-zinc-200 rounded px-2 py-1">
                <Activity size={14} className="text-zinc-500" />
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((beat) => (
                    <div
                      key={beat}
                      className={`w-2 h-2 rounded-full transition-all duration-75 ${
                        metronomeBeat === beat ? 'bg-amber-500 scale-150' : 'bg-zinc-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
        </div>

        <div className="flex items-center gap-2">
            <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded hover:bg-zinc-200 ${showSettings ? 'bg-zinc-200 text-amber-600' : 'text-zinc-600'}`}
            >
                <Layers size={20} />
            </button>
            <span className="text-xs font-bold text-zinc-400 px-2">AlphaTab</span>
        </div>
      </div>

      {/* Progress Bar */}
      {!readOnly && totalTime > 0 && (
        <div className="bg-zinc-100 border-b border-zinc-300 px-4 py-2 flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono text-zinc-600 w-12 text-right">
            {formattedCurrentTime}
          </span>

          <div
            className="flex-1 h-2 bg-zinc-200 rounded-full cursor-pointer group relative"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percentage = Math.max(0, Math.min(1, x / rect.width));
              seekTo(percentage);
            }}
          >
            {/* Progress fill */}
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${progressPercentage}%` }}
            />

            {/* Hover scrubber */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-amber-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `${progressPercentage}%` }}
            />
          </div>

          <span className="text-xs font-mono text-zinc-600 w-12">
            {formattedTotalTime}
          </span>
        </div>
      )}

      {/* Loop selection hint */}
      {selectionStart !== null && (
        <div className="bg-amber-100 border-b border-amber-400 text-amber-800 px-3 py-1 text-xs">
          Loop start set - Shift+Click another measure to set end
        </div>
      )}

      {/* Mixer Overlay */}
      {showSettings && (
         <div className="absolute top-14 right-2 z-20 bg-white shadow-xl border border-zinc-200 rounded-xl p-4 w-64 animate-in fade-in zoom-in-95 max-h-[80%] flex flex-col">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Sliders size={14}/> Mixer</h4>
            <div className="overflow-y-auto flex-1 space-y-2">
                {tracks.map((track, i) => (
                    <div key={i} className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-100">
                        <div className="flex items-center gap-2 overflow-hidden" onClick={() => renderTrack(track)}>
                            <div className="w-3 h-3 rounded-full bg-amber-500 cursor-pointer"></div>
                            <span className="text-xs truncate cursor-pointer hover:underline font-medium">{track.name}</span>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => toggleTrackMute(track)} className={`text-[10px] px-1.5 rounded border ${track.playbackInfo.isMute ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-400'}`}>M</button>
                            <button onClick={() => toggleTrackSolo(track)} className={`text-[10px] px-1.5 rounded border ${track.playbackInfo.isSolo ? 'bg-yellow-100 text-yellow-600' : 'bg-zinc-100 text-zinc-400'}`}>S</button>
                        </div>
                    </div>
                ))}
            </div>
         </div>
      )}

      {/* Render Area */}
      <div ref={rootRef} className="flex-1 overflow-auto relative bg-white">
          {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/90">
                 <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full"></div>
                    <p className="text-xs font-bold text-zinc-500">Parsing Tab...</p>
                 </div>
              </div>
          )}
          {error && (
              <div className="absolute inset-0 flex items-center justify-center z-50 bg-white pointer-events-auto">
                 <div className="text-center p-6 max-w-md">
                    <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                    <h4 className="font-bold text-red-600 mb-2 text-lg">Guitar Pro File Error</h4>
                    <p className="text-sm text-zinc-600 mb-4 leading-relaxed">{error}</p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setRetryKey(k => k + 1);
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
                      >
                        Retry Loading
                      </button>
                      <p className="text-xs text-zinc-500 mt-2">
                        <strong>Troubleshooting:</strong> Try converting the file to a newer Guitar Pro format (.gpx or .gp5),
                        ensure it's not corrupted, or export as PDF/image instead.
                      </p>
                    </div>
                 </div>
              </div>
          )}
          <div ref={containerRef} className="min-h-full" />
      </div>
    </div>
  );
};
