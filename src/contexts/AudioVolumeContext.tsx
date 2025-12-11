import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface AudioVolumeState {
  backingTrackVolume: number; // 0-1, persisted to localStorage
  backingTrackMuted: boolean;
}

interface AudioVolumeContextValue extends AudioVolumeState {
  setBackingTrackVolume: (volume: number) => void;
  toggleBackingTrackMute: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'band-assist-audio-volume';
const DEFAULT_VOLUME = 0.8;

// =============================================================================
// CONTEXT
// =============================================================================

const AudioVolumeContext = createContext<AudioVolumeContextValue | null>(null);

AudioVolumeContext.displayName = 'AudioVolumeContext';

// =============================================================================
// PROVIDER
// =============================================================================

interface AudioVolumeProviderProps {
  children: React.ReactNode;
}

export function AudioVolumeProvider({ children }: AudioVolumeProviderProps) {
  // Initialize from localStorage with fallback
  const [state, setState] = useState<AudioVolumeState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AudioVolumeState>;
        // Validate stored volume is a finite number to guard against NaN/Infinity
        const storedVolume =
          typeof parsed.backingTrackVolume === 'number' && Number.isFinite(parsed.backingTrackVolume)
            ? parsed.backingTrackVolume
            : undefined;
        return {
          backingTrackVolume:
            storedVolume !== undefined
              ? Math.max(0, Math.min(1, storedVolume))
              : DEFAULT_VOLUME,
          backingTrackMuted: typeof parsed.backingTrackMuted === 'boolean'
            ? parsed.backingTrackMuted
            : false,
        };
      }
    } catch {
      // localStorage unavailable or invalid data - use defaults
    }
    return {
      backingTrackVolume: DEFAULT_VOLUME,
      backingTrackMuted: false,
    };
  });

  // Persist state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage unavailable (Safari private browsing, etc.) - continue without persistence
    }
  }, [state]);

  const setBackingTrackVolume = useCallback((volume: number) => {
    // Guard against NaN/Infinity values
    if (!Number.isFinite(volume)) {
      return;
    }
    // Clamp to valid range and round to avoid floating-point precision issues
    const clampedVolume = Math.round(Math.max(0, Math.min(1, volume)) * 100) / 100;
    setState(prev => ({
      ...prev,
      backingTrackVolume: clampedVolume,
      // Auto-unmute when volume is set (unless setting to 0)
      backingTrackMuted: clampedVolume === 0 ? prev.backingTrackMuted : false,
    }));
  }, []);

  const toggleBackingTrackMute = useCallback(() => {
    setState(prev => ({
      ...prev,
      backingTrackMuted: !prev.backingTrackMuted,
    }));
  }, []);

  const value = useMemo<AudioVolumeContextValue>(
    () => ({
      backingTrackVolume: state.backingTrackVolume,
      backingTrackMuted: state.backingTrackMuted,
      setBackingTrackVolume,
      toggleBackingTrackMute,
    }),
    [state.backingTrackVolume, state.backingTrackMuted, setBackingTrackVolume, toggleBackingTrackMute]
  );

  return (
    <AudioVolumeContext.Provider value={value}>
      {children}
    </AudioVolumeContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for accessing audio volume controls.
 * @throws Error if used outside of AudioVolumeProvider
 * @returns The audio volume context value
 */
export function useAudioVolume(): AudioVolumeContextValue {
  const context = useContext(AudioVolumeContext);
  if (!context) {
    throw new Error('useAudioVolume must be used within an AudioVolumeProvider');
  }
  return context;
}

/**
 * Hook that returns the effective volume (accounting for mute state).
 * Useful when applying volume to audio elements.
 * @returns The effective volume (0 if muted, otherwise the current volume)
 */
export function useEffectiveVolume(): number {
  const { backingTrackVolume, backingTrackMuted } = useAudioVolume();
  return backingTrackMuted ? 0 : backingTrackVolume;
}
