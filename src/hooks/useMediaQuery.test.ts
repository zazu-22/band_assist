import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery, useIsMobile, useIsDesktop } from './useMediaQuery';

describe('useMediaQuery', () => {
  let listeners: Array<(event: MediaQueryListEvent) => void> = [];
  let matchesValue = false;

  const mockMatchMedia = (matches: boolean) => {
    matchesValue = matches;
    return vi.fn().mockImplementation((query: string) => ({
      matches: matchesValue,
      media: query,
      onchange: null,
      addEventListener: vi.fn((event: string, callback: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          listeners.push(callback);
        }
      }),
      removeEventListener: vi.fn((event: string, callback: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          listeners = listeners.filter((l) => l !== callback);
        }
      }),
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
  };

  beforeEach(() => {
    listeners = [];
    matchesValue = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useMediaQuery', () => {
    it('returns true when media query matches', () => {
      window.matchMedia = mockMatchMedia(true);
      const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
      expect(result.current).toBe(true);
    });

    it('returns false when media query does not match', () => {
      window.matchMedia = mockMatchMedia(false);
      const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
      expect(result.current).toBe(false);
    });

    it('updates when media query changes', () => {
      window.matchMedia = mockMatchMedia(false);
      const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
      expect(result.current).toBe(false);

      // Simulate media query change
      act(() => {
        matchesValue = true;
        // Update the mock to return new value
        window.matchMedia = mockMatchMedia(true);
        // Trigger change event
        listeners.forEach((callback) => {
          callback({ matches: true } as MediaQueryListEvent);
        });
      });

      // Re-render to get updated value
      const { result: result2 } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
      expect(result2.current).toBe(true);
    });

    it('cleans up listener on unmount', () => {
      const removeEventListener = vi.fn();
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener,
        dispatchEvent: vi.fn(),
      }));

      const { unmount } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
      unmount();

      expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('useIsMobile', () => {
    it('returns true for mobile viewport (< 768px)', () => {
      window.matchMedia = mockMatchMedia(true);
      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(true);
    });

    it('returns false for desktop viewport (>= 768px)', () => {
      window.matchMedia = mockMatchMedia(false);
      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(false);
    });
  });

  describe('useIsDesktop', () => {
    it('returns true for desktop viewport (>= 1024px)', () => {
      window.matchMedia = mockMatchMedia(true);
      const { result } = renderHook(() => useIsDesktop());
      expect(result.current).toBe(true);
    });

    it('returns false for mobile/tablet viewport (< 1024px)', () => {
      window.matchMedia = mockMatchMedia(false);
      const { result } = renderHook(() => useIsDesktop());
      expect(result.current).toBe(false);
    });
  });
});
