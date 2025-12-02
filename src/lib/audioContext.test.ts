import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAudioContext,
  activateAudioContext,
  closeAudioContext,
} from './audioContext';

// Mock AudioContext
class MockAudioContext {
  state: AudioContextState = 'suspended';
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

describe('audioContext utilities', () => {
  let originalAudioContext: typeof window.AudioContext | undefined;
  let originalWebkitAudioContext: typeof window.webkitAudioContext | undefined;

  beforeEach(() => {
    // Store original values
    originalAudioContext = window.AudioContext;
    originalWebkitAudioContext = window.webkitAudioContext;

    // Reset module state by closing any existing context
    closeAudioContext();
  });

  afterEach(() => {
    // Restore original values
    if (originalAudioContext) {
      window.AudioContext = originalAudioContext;
    } else {
      // @ts-expect-error - Removing property for test cleanup
      delete window.AudioContext;
    }
    if (originalWebkitAudioContext) {
      window.webkitAudioContext = originalWebkitAudioContext;
    } else {
      delete window.webkitAudioContext;
    }
  });

  describe('getAudioContext', () => {
    it('returns the same singleton instance on multiple calls', () => {
      window.AudioContext = MockAudioContext as unknown as typeof AudioContext;

      const ctx1 = getAudioContext();
      const ctx2 = getAudioContext();

      expect(ctx1).toBe(ctx2);
      expect(ctx1).toBeInstanceOf(MockAudioContext);
    });

    it('uses webkitAudioContext as fallback for Safari', () => {
      // @ts-expect-error - Removing property for test
      delete window.AudioContext;
      window.webkitAudioContext =
        MockAudioContext as unknown as typeof AudioContext;

      const ctx = getAudioContext();

      expect(ctx).toBeInstanceOf(MockAudioContext);
    });

    it('returns null when Web Audio API is unavailable', () => {
      // @ts-expect-error - Removing property for test
      delete window.AudioContext;
      delete window.webkitAudioContext;

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const ctx = getAudioContext();

      expect(ctx).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        '[audioContext] Web Audio API not available'
      );

      warnSpy.mockRestore();
    });

    it('logs debug message when creating new context', () => {
      window.AudioContext = MockAudioContext as unknown as typeof AudioContext;
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      getAudioContext();

      expect(debugSpy).toHaveBeenCalledWith(
        '[audioContext] Created new AudioContext, state:',
        'suspended'
      );

      debugSpy.mockRestore();
    });
  });

  describe('activateAudioContext', () => {
    it('resumes suspended audio context', async () => {
      const mockResume = vi.fn().mockResolvedValue(undefined);
      class SuspendedContext {
        state: AudioContextState = 'suspended';
        resume = mockResume;
        close = vi.fn();
      }
      window.AudioContext = SuspendedContext as unknown as typeof AudioContext;

      await activateAudioContext();

      expect(mockResume).toHaveBeenCalled();
    });

    it('does not resume already running context', async () => {
      const mockResume = vi.fn().mockResolvedValue(undefined);
      class RunningContext {
        state: AudioContextState = 'running';
        resume = mockResume;
        close = vi.fn();
      }
      window.AudioContext = RunningContext as unknown as typeof AudioContext;

      // First create the context
      getAudioContext();
      // Then try to activate
      await activateAudioContext();

      expect(mockResume).not.toHaveBeenCalled();
    });

    it('handles resume failure gracefully', async () => {
      const mockResume = vi.fn().mockRejectedValue(new Error('Resume failed'));
      class FailingContext {
        state: AudioContextState = 'suspended';
        resume = mockResume;
        close = vi.fn();
      }
      window.AudioContext = FailingContext as unknown as typeof AudioContext;

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Should not throw
      await expect(activateAudioContext()).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledWith(
        '[audioContext] Failed to resume AudioContext:',
        expect.any(Error)
      );

      warnSpy.mockRestore();
    });

    it('does nothing when Web Audio API is unavailable', async () => {
      // @ts-expect-error - Removing property for test
      delete window.AudioContext;
      delete window.webkitAudioContext;

      // Suppress the warning about unavailable API
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Should not throw
      await expect(activateAudioContext()).resolves.toBeUndefined();

      warnSpy.mockRestore();
    });
  });

  describe('closeAudioContext', () => {
    it('closes and nullifies the shared context', () => {
      const mockClose = vi.fn();
      class CloseableContext {
        state: AudioContextState = 'running';
        resume = vi.fn();
        close = mockClose;
      }
      window.AudioContext = CloseableContext as unknown as typeof AudioContext;

      // Suppress debug log
      vi.spyOn(console, 'debug').mockImplementation(() => {});

      // Create context first
      const ctx1 = getAudioContext();
      expect(ctx1).not.toBeNull();

      // Close it
      closeAudioContext();

      expect(mockClose).toHaveBeenCalled();

      // Getting context again should create a new one
      const ctx2 = getAudioContext();
      expect(ctx2).not.toBe(ctx1);
    });

    it('does nothing when no context exists', () => {
      // Should not throw
      expect(() => closeAudioContext()).not.toThrow();
    });
  });
});
