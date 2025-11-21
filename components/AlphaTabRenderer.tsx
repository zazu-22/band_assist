
import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Sliders, Layers, Activity, Music2, AlertTriangle } from 'lucide-react';

// Extend window interface to include alphaTab from CDN
declare global {
  interface Window {
    alphaTab: any;
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
  const apiRef = useRef<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState(1.0);
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

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

        // 4. Attach Events
        api.scoreLoaded.on((score: any) => {
          if(!isMounted) return;
          console.log("[AlphaTab] Score Loaded Successfully", score);
          clearTimeout(timeoutId);
          setTracks(score.tracks);
          setLoading(false);
        });

        api.error.on((e: any) => {
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
        });

        api.playerStateChanged.on((args: any) => {
          if(!isMounted) return;
          const playing = args.state === 1;
          setInternalIsPlaying(playing);
          if (onPlaybackChange) onPlaybackChange(playing);
        });

        api.playerReady.on(() => {
          console.log("[AlphaTab] Player Ready");
        });

        api.renderStarted.on(() => {
          console.log("[AlphaTab] Rendering started...");
        });

        api.renderFinished.on(() => {
          console.log("[AlphaTab] Rendering finished");
        });

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
      if (apiRef.current) {
        try {
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

  return (
    <div className="flex flex-col h-full bg-white text-black rounded-xl overflow-hidden relative border border-zinc-200">
      {/* Toolbar */}
      <div className="bg-zinc-100 border-b border-zinc-300 p-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
            {!readOnly && (
                <button 
                    onClick={togglePlay}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${internalIsPlaying ? 'bg-amber-500 text-white' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'}`}
                >
                    {internalIsPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                </button>
            )}
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
