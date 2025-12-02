/**
 * Shared AudioContext utility for iOS Safari audio activation.
 *
 * iOS Safari requires explicit user gesture to "unlock" the AudioContext
 * before any audio can play. This module provides a singleton AudioContext
 * that can be activated once and reused throughout the application.
 */

// Augment Window interface for Safari compatibility
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

let sharedContext: AudioContext | null = null;

/**
 * Get or create the shared AudioContext singleton.
 * Returns null if Web Audio API is unavailable.
 */
export function getAudioContext(): AudioContext | null {
  if (sharedContext) return sharedContext;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    console.warn('[audioContext] Web Audio API not available');
    return null;
  }

  sharedContext = new AudioContextClass();
  // eslint-disable-next-line no-console -- Intentional debug logging for audio troubleshooting
  console.debug('[audioContext] Created new AudioContext, state:', sharedContext.state);
  return sharedContext;
}

/**
 * Close and dispose of the shared AudioContext.
 * Call this during app cleanup if needed.
 */
export function closeAudioContext(): void {
  if (sharedContext) {
    sharedContext.close();
    sharedContext = null;
  }
}

/**
 * Activate (resume) the shared AudioContext.
 * Call this within a user gesture (click/tap) to unlock audio on iOS Safari.
 */
export async function activateAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (error) {
      console.warn('[audioContext] Failed to resume AudioContext:', error);
      // Don't throw - this is a best-effort activation
    }
  }
}
