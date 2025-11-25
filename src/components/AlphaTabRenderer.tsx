import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  Sliders,
  Music2,
  AlertTriangle,
  Repeat,
  X,
  Timer,
  CircleGauge,
  Scroll,
  Gauge,
} from 'lucide-react';

// Constants
const POSITION_UPDATE_THROTTLE_MS = 100; // Throttle position updates to ~10 FPS for performance
const METRONOME_HIGHLIGHT_DURATION_FACTOR = 0.3; // Duration factor for metronome beat highlight
const PLAYBACK_RETRY_DELAY_MS = 100; // Delay before retrying failed play/pause operations
type PlaybackAction = 'play' | 'pause';

// AlphaTab type definitions
interface AlphaTabScore {
  tracks: AlphaTabTrack[];
  tempo: number;
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

interface AlphaTabSettings {
  core?: {
    fontDirectory?: string;
    includeNoteBounds?: boolean;
    useWorkers?: boolean;
  };
  player?: {
    enablePlayer?: boolean;
    soundFont?: string;
    scrollElement?: HTMLElement | null;
  };
  display?: {
    layoutMode?: string;
    staveProfile?: string;
  };
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
  scoreLoaded: {
    on(callback: (score: AlphaTabScore) => void): void;
    off(callback: (score: AlphaTabScore) => void): void;
  };
  error: {
    on(callback: (e: AlphaTabErrorEvent) => void): void;
    off(callback: (e: AlphaTabErrorEvent) => void): void;
  };
  playerStateChanged: {
    on(callback: (args: AlphaTabPlayerStateChangedEvent) => void): void;
    off(callback: (args: AlphaTabPlayerStateChangedEvent) => void): void;
  };
  playerReady: { on(callback: () => void): void; off(callback: () => void): void };
  renderStarted: { on(callback: () => void): void; off(callback: () => void): void };
  renderFinished: { on(callback: () => void): void; off(callback: () => void): void };
  playerPositionChanged: {
    on(callback: (e: AlphaTabPositionChangedEvent) => void): void;
    off(callback: (e: AlphaTabPositionChangedEvent) => void): void;
  };
  playerFinished: { on(callback: () => void): void; off(callback: () => void): void };
  beatMouseDown: {
    on(callback: (e: AlphaTabBeatMouseEvent) => void): void;
    off(callback: (e: AlphaTabBeatMouseEvent) => void): void;
  };
  midiEventsPlayed: {
    on(callback: (e: AlphaTabMidiEventsPlayedEvent) => void): void;
    off(callback: (e: AlphaTabMidiEventsPlayedEvent) => void): void;
  };
  midiEventsPlayedFilter: number[];
}

// Extend window interface to include alphaTab from CDN
declare global {
  interface Window {
    alphaTab: {
      AlphaTabApi: new (element: HTMLElement, settings: AlphaTabSettings) => AlphaTabApi;
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
  readOnly = false,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<AlphaTabApi | null>(null);
  const metronomeTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const cleanupEventListenersRef = useRef<(() => void) | null>(null);
  const mixerButtonRef = useRef<HTMLButtonElement | null>(null);
  const mixerPanelRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<AlphaTabTrack[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState(1.0);
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [soloStateBeforeSolo, setSoloStateBeforeSolo] = useState<{
    mutes: boolean[];
    solos: boolean[];
  } | null>(null);

  // Phase 1: Transport controls state
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [loopRange, setLoopRange] = useState<{ start: number; end: number } | null>(null);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);

  // Phase 2: Visual feedback state
  const [metronomeBeat, setMetronomeBeat] = useState<number>(0);

  // Phase 3: BPM display and tempo control
  const [originalTempo, setOriginalTempo] = useState<number | null>(null);
  const [currentBPM, setCurrentBPM] = useState<number | null>(null);
  const [isEditingBPM, setIsEditingBPM] = useState(false);
  const [bpmInputValue, setBpmInputValue] = useState<string>('');

  // Auto-scroll state
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(0.5); // Default to middle speed
  const autoScrollRef = useRef<number | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const playbackRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPlaybackActionRef = useRef<PlaybackAction | null>(null);
  const internalIsPlayingRef = useRef(internalIsPlaying);
  const lastExternalSyncRef = useRef<boolean | undefined>(undefined);

  const getEffectiveIsPlaying = () =>
    pendingPlaybackActionRef.current !== null
      ? pendingPlaybackActionRef.current === 'play'
      : internalIsPlayingRef.current;

  useEffect(() => {
    internalIsPlayingRef.current = internalIsPlaying;

    const pendingAction = pendingPlaybackActionRef.current;
    if (pendingAction !== null && (pendingAction === 'play') === internalIsPlaying) {
      pendingPlaybackActionRef.current = null;
    }
  }, [internalIsPlaying]);

  useEffect(() => {
    return () => {
      if (playbackRetryTimeoutRef.current) {
        clearTimeout(playbackRetryTimeoutRef.current);
        playbackRetryTimeoutRef.current = null;
      }
    };
  }, []);

  // Close mixer when clicking outside
  useEffect(() => {
    if (!showSettings) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (mixerPanelRef.current?.contains(target)) return;
      if (mixerButtonRef.current?.contains(target)) return;
      setShowSettings(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [showSettings]);

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
      console.error('Error converting base64 to binary', e);
      return null;
    }
  };

  // Initialize AlphaTab
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let checkAttempts = 0;
    const MAX_CHECK_ATTEMPTS = 50; // 10 seconds

    // Capture ref value at effect start for cleanup
    const metronomeTimeouts = metronomeTimeoutsRef.current;

    // Wait for AlphaTab CDN script to load
    const checkLibrary = () => {
      checkAttempts++;
      if (!window.alphaTab) {
        if (checkAttempts >= MAX_CHECK_ATTEMPTS) {
          if (isMounted) {
            setError(
              'AlphaTab library failed to load from CDN. Please check your internet connection.'
            );
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
          console.error('[AlphaTab] Error destroying previous instance', e);
        }
        apiRef.current = null;
      }

      setLoading(true);
      setError(null);
      setPlayerReady(false);

      // Set a timeout for loading
      timeoutId = setTimeout(() => {
        if (isMounted && loading) {
          setError(
            'Loading timeout. The file may be too large, corrupted, or incompatible with this environment.'
          );
          setLoading(false);
        }
      }, 15000); // 15 second timeout

      try {
        // 2. Configure Settings
        const settings: AlphaTabSettings = {
          core: {
            fontDirectory: '/font/', // Use locally served Bravura fonts
            includeNoteBounds: false,
            useWorkers: true, // CDN version can use workers
          },
          player: {
            enablePlayer: !readOnly, // Disable player in readonly mode
            soundFont:
              'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2',
            scrollElement: rootRef.current,
          },
          display: {
            layoutMode: 'page', // Always use page layout for better readability
            staveProfile: 'Default',
          },
        };

        // 3. Initialize API
        const api = new window.alphaTab.AlphaTabApi(containerRef.current, settings);
        apiRef.current = api;

        // 4. Attach Events - Store handlers for cleanup
        const handleScoreLoaded = (score: AlphaTabScore) => {
          if (!isMounted) return;
          clearTimeout(timeoutId);
          setTracks(score.tracks);
          // AlphaTab renders first track by default
          setCurrentTrackIndex(0);

          // Extract original tempo
          const tempo = score.tempo || 120; // Default to 120 if not specified
          setOriginalTempo(tempo);
          setCurrentBPM(Math.round(tempo * currentSpeed));

          setLoading(false);
        };

        const handleError = (e: AlphaTabErrorEvent) => {
          if (!isMounted) return;
          console.error('[AlphaTab] Error Event:', e);
          clearTimeout(timeoutId);

          // Provide more specific error messages
          let errorMsg = 'Failed to load Guitar Pro file.';
          if (e?.message) {
            errorMsg += ` ${e.message}`;
          }
          if (e?.inner) {
            errorMsg += ` Details: ${e.inner}`;
          }
          errorMsg +=
            ' The file may be corrupted, an unsupported version, or incompatible with this environment.';

          setError(errorMsg);
          setLoading(false);
        };

        const handlePlayerStateChanged = (args: AlphaTabPlayerStateChangedEvent) => {
          if (!isMounted) return;
          const playing = args.state === 1;

          // Reset metronome when playback stops to avoid desync
          if (!playing) {
            setMetronomeBeat(0);
            // Clear any pending metronome timeouts
            metronomeTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
            metronomeTimeoutsRef.current.clear();
          }

          setInternalIsPlaying(playing);
          if (onPlaybackChange) onPlaybackChange(playing);
        };

        const handlePlayerReady = () => {
          if (!isMounted) return;
          // Add delay to ensure audio context is fully initialized
          setTimeout(() => {
            if (isMounted) {
              setPlayerReady(true);
            }
          }, 500);
        };

        const handleRenderStarted = () => {
          if (!isMounted) return;
        };

        const handleRenderFinished = () => {
          if (!isMounted) return;
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

          // AlphaTab fires playerFinished at the end of every loop iteration.
          // Ignore these notifications while looping so play/pause/stop stay in sync.
          if (apiRef.current?.isLooping) {
            return;
          }

          setInternalIsPlaying(false);
          if (onPlaybackChange) onPlaybackChange(false);
        };

        // Phase 1: Beat selection for loop - capture ref outside state setter to avoid stale closure
        const handleBeatMouseDown = (e: AlphaTabBeatMouseEvent) => {
          if (!isMounted) return;
          if (!e.originalEvent) return; // Guard against missing originalEvent

          // Shift+Click to set loop range
          if (e.originalEvent.shiftKey) {
            const beatStart = e.beat.absolutePlaybackStart;
            const beatEnd = beatStart + e.beat.playbackDuration;
            const api = apiRef.current; // Capture ref value outside state setter

            setSelectionStart(currentStart => {
              if (currentStart === null) {
                // First click - set start point
                return beatStart;
              } else {
                // Second click - create range
                const startTick = Math.min(currentStart, beatStart);
                const endTick = Math.max(currentStart + e.beat.playbackDuration, beatEnd);

                if (api) {
                  api.playbackRange = { startTick, endTick };
                }
                setLoopRange({ start: startTick, end: endTick });

                return null;
              }
            });
          }
        };

        // Phase 2: Visual metronome
        api.midiEventsPlayedFilter = [window.alphaTab.midi.MidiEventType.AlphaTabMetronome];

        const handleMidiEventsPlayed = (e: AlphaTabMidiEventsPlayedEvent) => {
          if (!isMounted) return;

          for (const midi of e.events) {
            if (midi.isMetronome) {
              // AlphaTab sends 0-indexed beat numbers (0, 1, 2, 3)
              // Convert to 1-indexed for display (1, 2, 3, 4)
              const displayBeat = midi.metronomeNumerator + 1;
              setMetronomeBeat(displayBeat);

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
          api.load(data);
        } else {
          clearTimeout(timeoutId);
          console.error('[AlphaTab] Data preparation failed');
          setError('Invalid file data format. Could not convert Base64 to binary.');
          setLoading(false);
        }
      } catch (e: unknown) {
        console.error('[AlphaTab] Setup Exception', e);
        clearTimeout(timeoutId);
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        setError(
          `Initialization error: ${errorMessage}. This might be an environment compatibility issue.`
        );
        setLoading(false);
      }
    };

    checkLibrary();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);

      // Clear all metronome timeouts - use captured value from effect start
      metronomeTimeouts.forEach(timeout => clearTimeout(timeout));
      metronomeTimeouts.clear();

      if (apiRef.current) {
        try {
          // Explicitly cleanup event listeners before destroying
          if (cleanupEventListenersRef.current) {
            cleanupEventListenersRef.current();
          }
          apiRef.current.destroy();
        } catch (e) {
          console.error('[AlphaTab] Error during cleanup', e);
        }
      }
    };
    // Dependencies intentionally limited to [fileData, readOnly, retryKey]
    // Adding all hook dependencies would cause re-initialization on every state change
    // This effect should only re-run when the file or retry counter changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileData, readOnly, retryKey]);

  // Auto-scroll Logic
  useEffect(() => {
    if (!autoScrollEnabled || !rootRef.current) {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }
      return;
    }

    // Map slider value (0.1 to 1.0) to pixels per frame (0.25 to 1.0)
    // This ensures all speeds are visible and useful for performance
    const minPixels = 0.25;
    const maxPixels = 1.0;
    const pixelsPerFrame =
      minPixels + ((scrollSpeed - 0.1) * (maxPixels - minPixels)) / (1.0 - 0.1);

    const animate = (currentTime: number) => {
      if (!rootRef.current) return;

      const deltaTime = currentTime - lastScrollTimeRef.current;

      // Throttle to ~60fps
      if (deltaTime >= 16) {
        rootRef.current.scrollTop += pixelsPerFrame;
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
  }, [autoScrollEnabled, scrollSpeed]);

  const runPlaybackAction = useCallback(
    (action: PlaybackAction, isRetry = false) => {
      if (!apiRef.current) {
        if (!isRetry) {
          pendingPlaybackActionRef.current = null;
        }
        return;
      }

      if (playbackRetryTimeoutRef.current) {
        clearTimeout(playbackRetryTimeoutRef.current);
        playbackRetryTimeoutRef.current = null;
      }

      try {
        if (action === 'play') {
          apiRef.current.play();
        } else {
          apiRef.current.pause();
        }
      } catch (error) {
        if (isRetry) {
          console.error(`[AlphaTab] Playback ${action} failed:`, error);
          pendingPlaybackActionRef.current = null;
          if (action === 'play') {
            setInternalIsPlaying(false);
            if (onPlaybackChange) onPlaybackChange(false);
          }
          return;
        }

        console.warn(`[AlphaTab] Playback ${action} error, retrying...`, error);
        playbackRetryTimeoutRef.current = setTimeout(() => {
          playbackRetryTimeoutRef.current = null;
          runPlaybackAction(action, true);
        }, PLAYBACK_RETRY_DELAY_MS);
      }
    },
    [onPlaybackChange]
  );

  // External Playback Sync
  useEffect(() => {
    if (!apiRef.current) {
      return;
    }

    if (externalIsPlaying === undefined) {
      lastExternalSyncRef.current = undefined;
      return;
    }

    if (lastExternalSyncRef.current === externalIsPlaying) {
      return;
    }

    lastExternalSyncRef.current = externalIsPlaying;

    const effectiveIsPlaying = getEffectiveIsPlaying();
    if (externalIsPlaying === effectiveIsPlaying) {
      return;
    }

    const action: PlaybackAction = externalIsPlaying ? 'play' : 'pause';
    pendingPlaybackActionRef.current = action;
    runPlaybackAction(action);
  }, [externalIsPlaying, runPlaybackAction]);

  const togglePlay = () => {
    if (!apiRef.current || !playerReady) {
      return;
    }

    const nextAction: PlaybackAction = getEffectiveIsPlaying() ? 'pause' : 'play';
    pendingPlaybackActionRef.current = nextAction;
    runPlaybackAction(nextAction);
  };

  // Manual scroll functions
  const _scrollBy = (amount: number) => {
    if (rootRef.current) {
      rootRef.current.scrollBy({ top: amount, behavior: 'smooth' });
      // Pause auto-scroll on manual scroll
      if (autoScrollEnabled) {
        setAutoScrollEnabled(false);
      }
    }
  };

  const _scrollToTop = () => {
    if (rootRef.current) {
      rootRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const _handleUserScroll = () => {
    // Pause auto-scroll if user manually scrolls
    if (autoScrollEnabled) {
      setAutoScrollEnabled(false);
    }
  };

  const changeSpeed = (val: number) => {
    if (apiRef.current) {
      apiRef.current.playbackSpeed = val;
      setCurrentSpeed(val);

      // Update current BPM
      if (originalTempo) {
        setCurrentBPM(Math.round(originalTempo * val));
      }
    }
  };

  const handleBPMChange = (newBPM: number) => {
    if (!originalTempo || !apiRef.current) return;

    const newSpeed = newBPM / originalTempo;
    // Clamp to supported range (0.25 to 2.0)
    const clampedSpeed = Math.max(0.25, Math.min(2.0, newSpeed));

    apiRef.current.playbackSpeed = clampedSpeed;
    setCurrentSpeed(clampedSpeed);
    setCurrentBPM(Math.round(originalTempo * clampedSpeed));
  };

  const startEditingBPM = () => {
    if (!currentBPM) return;
    setBpmInputValue(currentBPM.toString());
    setIsEditingBPM(true);
  };

  const submitBPMEdit = () => {
    const newBPM = parseInt(bpmInputValue);
    if (!isNaN(newBPM) && originalTempo) {
      const minBPM = Math.round(originalTempo * 0.25);
      const maxBPM = Math.round(originalTempo * 2.0);
      const clampedBPM = Math.max(minBPM, Math.min(maxBPM, newBPM));
      handleBPMChange(clampedBPM);
    }
    setIsEditingBPM(false);
  };

  const resetToOriginalTempo = () => {
    changeSpeed(1.0);
  };

  // Helper to update tracks state from API
  const updateTracksFromAPI = () => {
    if (apiRef.current) {
      // Create new array reference to force React re-render, but keep full track objects
      const updatedTracks = [...apiRef.current.score.tracks];
      setTracks(updatedTracks);
    }
  };

  const renderTrack = (trackIndex: number) => {
    if (apiRef.current) {
      // Get the full track object from the API, not from React state
      const track = apiRef.current.score.tracks[trackIndex];
      apiRef.current.renderTracks([track]);
      setCurrentTrackIndex(trackIndex);
    }
  };

  const toggleTrackMute = (trackIndex: number) => {
    if (!apiRef.current) return;

    // Get track from API
    const track = apiRef.current.score.tracks[trackIndex];
    const currentMuteState = track.playbackInfo.isMute;
    const newMuteState = !currentMuteState;

    // Try BOTH: Set property directly AND call API method
    track.playbackInfo.isMute = newMuteState;
    apiRef.current.changeTrackMute([track], newMuteState);

    // Force immediate UI update
    updateTracksFromAPI();
  };

  const toggleTrackSolo = (trackIndex: number) => {
    if (!apiRef.current) return;

    const track = apiRef.current.score.tracks[trackIndex];
    const allTracks = apiRef.current.score.tracks;
    const currentSoloState = track.playbackInfo.isSolo;
    const newSoloState = !currentSoloState;

    if (newSoloState) {
      // ENABLING SOLO: Save current state before soloing
      const currentMutes = allTracks.map(t => t.playbackInfo.isMute);
      const currentSolos = allTracks.map(t => t.playbackInfo.isSolo);
      setSoloStateBeforeSolo({ mutes: currentMutes, solos: currentSolos });

      // Set property directly AND call API method
      track.playbackInfo.isSolo = true;
      apiRef.current.changeTrackSolo([track], true);
    } else {
      // DISABLING SOLO: Restore previous state
      track.playbackInfo.isSolo = false;
      apiRef.current.changeTrackSolo([track], false);

      if (soloStateBeforeSolo) {
        // Restore mute states
        allTracks.forEach((t, i) => {
          if (t.playbackInfo.isMute !== soloStateBeforeSolo.mutes[i]) {
            t.playbackInfo.isMute = soloStateBeforeSolo.mutes[i];
            apiRef.current!.changeTrackMute([t], soloStateBeforeSolo.mutes[i]);
          }
        });
        setSoloStateBeforeSolo(null);
      }
    }

    // Force immediate UI update
    updateTracksFromAPI();
  };

  // New transport control handlers
  const stopPlayback = () => {
    pendingPlaybackActionRef.current = null;
    if (playbackRetryTimeoutRef.current) {
      clearTimeout(playbackRetryTimeoutRef.current);
      playbackRetryTimeoutRef.current = null;
    }

    if (apiRef.current) {
      // Only call stop() if playback is actually active
      // This prevents "InvalidStateError: cannot call stop without calling start first"
      if (internalIsPlaying) {
        try {
          apiRef.current.stop();
        } catch (error) {
          console.warn('[AlphaTab] Error stopping playback:', error);
        }
      }
      setInternalIsPlaying(false);
      if (onPlaybackChange) onPlaybackChange(false);
    }
  };

  const seekTo = (percentage: number) => {
    if (!apiRef.current || totalTime <= 0) return;

    try {
      const targetTime = totalTime * percentage;
      if (isNaN(targetTime) || targetTime < 0 || targetTime > totalTime) {
        console.error('[AlphaTab] Invalid seek time:', targetTime);
        return;
      }
      apiRef.current.timePosition = targetTime;
    } catch (error) {
      console.error('[AlphaTab] Error seeking to position:', error);
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
  const progressPercentage = useMemo(
    () => (totalTime > 0 ? (currentTime / totalTime) * 100 : 0),
    [currentTime, totalTime]
  );

  return (
    <div className="flex flex-col max-h-full bg-white text-black rounded-xl relative border border-zinc-200 overflow-hidden">
      {/* Toolbar */}
      <div className="bg-zinc-100 border-b border-zinc-300 p-2 flex items-center justify-between shrink-0">
        {/* Left: Transport controls */}
        <div className="flex items-center gap-2 flex-1">
          {!readOnly && (
            <>
              <button
                onClick={togglePlay}
                disabled={!playerReady}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  !playerReady
                    ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                    : internalIsPlaying
                      ? 'bg-amber-500 text-white'
                      : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                }`}
                title={!playerReady ? 'Loading player...' : internalIsPlaying ? 'Pause' : 'Play'}
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

              {/* Loop controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleLoop}
                  className={`p-2 rounded transition-colors ${
                    isLooping
                      ? 'bg-amber-500 text-white'
                      : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
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
            </>
          )}
        </div>

        {/* Center: Track selector */}
        <div className="flex items-center justify-center flex-1">
          {currentTrackIndex !== null && tracks[currentTrackIndex] && (
            <button
              ref={mixerButtonRef}
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                showSettings
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800 hover:shadow-sm'
              }`}
              title="Click to open mixer and switch tracks"
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${showSettings ? 'bg-white' : 'bg-amber-500'}`}
              ></div>
              <span className="text-sm font-semibold">{tracks[currentTrackIndex].name}</span>
              <Sliders size={16} className={showSettings ? 'opacity-90' : 'opacity-60'} />
            </button>
          )}
        </div>

        {/* Right: Auto-scroll + BPM Display + Metronome + Speed control */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          {/* Auto-Scroll Controls - Only shown in Performance Mode (readOnly) */}
          {readOnly && (
            <>
              <div className="flex items-center gap-2 bg-zinc-200 rounded px-2 py-1">
                <button
                  onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-colors ${
                    autoScrollEnabled
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                  title="Toggle auto-scroll"
                >
                  <Scroll size={12} /> Auto
                </button>
                <div className="flex items-center gap-1 border-l border-zinc-300 pl-2">
                  <Gauge size={12} className="text-zinc-500" />
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={scrollSpeed}
                    onChange={e => setScrollSpeed(parseFloat(e.target.value))}
                    className="w-16 h-1 bg-zinc-300 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    title="Scroll speed multiplier"
                  />
                  <span className="text-[10px] font-mono text-zinc-600 w-6">{scrollSpeed}x</span>
                </div>
              </div>
            </>
          )}

          {/* BPM Display + Visual metronome */}
          {!readOnly && originalTempo && (
            <div className="flex items-center gap-2">
              {/* BPM Display - Clickable for direct input */}
              <div
                className="flex items-center gap-1 bg-zinc-200 rounded px-3 py-1 cursor-pointer hover:bg-zinc-300 transition-colors"
                onClick={startEditingBPM}
                title="Click to enter BPM directly"
              >
                <Music2 size={14} className="text-zinc-500" />
                {isEditingBPM ? (
                  <input
                    type="number"
                    value={bpmInputValue}
                    onChange={e => setBpmInputValue(e.target.value)}
                    onBlur={submitBPMEdit}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitBPMEdit();
                      if (e.key === 'Escape') setIsEditingBPM(false);
                    }}
                    autoFocus
                    className="w-12 bg-white border border-amber-500 rounded px-1 text-sm font-semibold text-center focus:outline-none"
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-sm font-semibold text-zinc-700">
                    {currentBPM || originalTempo}
                  </span>
                )}
                <span className="text-xs text-zinc-500">BPM</span>
              </div>

              {/* Reset button - only show when not at original tempo */}
              {currentSpeed !== 1.0 && (
                <button
                  onClick={resetToOriginalTempo}
                  className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-semibold transition-colors"
                  title="Reset to original tempo"
                >
                  Reset
                </button>
              )}

              {/* BPM Slider Control */}
              <div className="flex items-center gap-2 bg-zinc-200 rounded px-3 py-2">
                <Timer size={14} className="text-zinc-500" />
                <div className="flex flex-col gap-1">
                  <input
                    type="range"
                    min={Math.round(originalTempo * 0.25)}
                    max={Math.round(originalTempo * 2.0)}
                    step="1"
                    value={currentBPM || originalTempo}
                    onChange={e => handleBPMChange(parseInt(e.target.value))}
                    className="w-32 h-1 bg-zinc-300 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>{Math.round(originalTempo * 0.25)}</span>
                    <span className="font-semibold text-zinc-700">{currentBPM}</span>
                    <span>{Math.round(originalTempo * 2.0)}</span>
                  </div>
                </div>
              </div>

              {/* Metronome beat indicators */}
              <div className="flex items-center gap-1 bg-zinc-200 rounded px-2 py-1">
                <CircleGauge size={14} className="text-zinc-500" />
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(beat => (
                    <div
                      key={beat}
                      className={`w-2 h-2 rounded-full transition-all duration-75 ${
                        metronomeBeat === beat ? 'bg-amber-500 scale-150' : 'bg-zinc-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

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
            onClick={e => {
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

          <span className="text-xs font-mono text-zinc-600 w-12">{formattedTotalTime}</span>
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
        <div
          ref={mixerPanelRef}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-[9999] bg-white shadow-2xl border border-zinc-200 rounded-xl p-4 w-64 animate-in fade-in zoom-in-95 max-h-[80%] flex flex-col"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Sliders size={14} /> Mixer
            </h4>
            <button
              onClick={() => setShowSettings(false)}
              className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-600 transition-colors"
              title="Close mixer"
            >
              <X size={16} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 space-y-2">
            {tracks.map((track, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-2 rounded border transition-all ${
                  currentTrackIndex === i
                    ? 'bg-amber-50 border-amber-400 shadow-sm'
                    : 'bg-zinc-50 border-zinc-100'
                }`}
              >
                <div
                  className="flex items-center gap-2 overflow-hidden cursor-pointer"
                  onClick={() => renderTrack(i)}
                >
                  <div
                    className={`w-3 h-3 rounded-full transition-all ${
                      currentTrackIndex === i ? 'bg-amber-500' : 'bg-zinc-400'
                    }`}
                  ></div>
                  <span
                    className={`text-xs truncate hover:underline ${
                      currentTrackIndex === i
                        ? 'font-bold text-amber-900'
                        : 'font-medium text-zinc-700'
                    }`}
                  >
                    {track.name}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      toggleTrackMute(i);
                    }}
                    className={`text-[10px] font-bold px-2 py-1 rounded border transition-all ${
                      track.playbackInfo.isMute
                        ? 'bg-red-500 text-white border-red-600 shadow-sm'
                        : 'bg-white text-zinc-500 border-zinc-300 hover:bg-zinc-50'
                    }`}
                    title={track.playbackInfo.isMute ? 'Unmute track' : 'Mute track'}
                  >
                    M
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      toggleTrackSolo(i);
                    }}
                    className={`text-[10px] font-bold px-2 py-1 rounded border transition-all ${
                      track.playbackInfo.isSolo
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-zinc-500 border-zinc-300 hover:bg-zinc-50'
                    }`}
                    title={track.playbackInfo.isSolo ? 'Unsolo track' : 'Solo track'}
                  >
                    S
                  </button>
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
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setRetryKey(k => k + 1);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Retry Loading
                </button>
                <p className="text-xs text-zinc-500 mt-2">
                  <strong>Troubleshooting:</strong> Try converting the file to a newer Guitar Pro
                  format (.gpx or .gp5), ensure it&apos;s not corrupted, or export as PDF/image
                  instead.
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
