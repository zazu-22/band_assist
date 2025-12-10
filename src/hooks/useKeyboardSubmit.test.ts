import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardSubmit, isMacPlatform, getSubmitShortcutHint } from './useKeyboardSubmit';

type EventListenerCall = [string, EventListenerOrEventListenerObject, ...unknown[]];

// Helper to find keydown handler from spy calls
function findKeydownHandler(
  spy: ReturnType<typeof vi.spyOn>
): EventListener | undefined {
  const calls = spy.mock.calls as EventListenerCall[];
  const call = calls.find((c) => c[0] === 'keydown');
  return call?.[1] as EventListener | undefined;
}

// Helper to find the latest keydown handler (after rerenders)
function findLatestKeydownHandler(
  spy: ReturnType<typeof vi.spyOn>
): EventListener | undefined {
  const calls = spy.mock.calls as EventListenerCall[];
  const keydownCalls = calls.filter((c) => c[0] === 'keydown');
  const lastCall = keydownCalls[keydownCalls.length - 1];
  return lastCall?.[1] as EventListener | undefined;
}

// Helper to count keydown listener calls
function countKeydownCalls(spy: ReturnType<typeof vi.spyOn>): number {
  const calls = spy.mock.calls as EventListenerCall[];
  return calls.filter((c) => c[0] === 'keydown').length;
}

describe('useKeyboardSubmit', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call onSubmit when Cmd+Enter is pressed', () => {
    const onSubmit = vi.fn();
    renderHook(() => useKeyboardSubmit({ onSubmit }));

    // Get the registered keydown handler
    const keydownHandler = findKeydownHandler(addEventListenerSpy);

    expect(keydownHandler).toBeDefined();

    // Simulate Cmd+Enter (Mac)
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      metaKey: true,
      bubbles: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    keydownHandler!(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('should call onSubmit when Ctrl+Enter is pressed', () => {
    const onSubmit = vi.fn();
    renderHook(() => useKeyboardSubmit({ onSubmit }));

    const keydownHandler = findKeydownHandler(addEventListenerSpy);

    // Simulate Ctrl+Enter (Windows/Linux)
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    keydownHandler!(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('should not call onSubmit when just Enter is pressed', () => {
    const onSubmit = vi.fn();
    renderHook(() => useKeyboardSubmit({ onSubmit }));

    const keydownHandler = findKeydownHandler(addEventListenerSpy);

    // Simulate just Enter without modifier
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
    });

    keydownHandler!(event);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should not call onSubmit when enabled is false', () => {
    const onSubmit = vi.fn();
    renderHook(() => useKeyboardSubmit({ enabled: false, onSubmit }));

    // When disabled, no event listener should be added
    expect(countKeydownCalls(addEventListenerSpy)).toBe(0);
  });

  it('should remove event listener on unmount', () => {
    const onSubmit = vi.fn();
    const { unmount } = renderHook(() => useKeyboardSubmit({ onSubmit }));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );
  });

  it('should update handler when onSubmit changes', () => {
    const onSubmit1 = vi.fn();
    const onSubmit2 = vi.fn();
    const { rerender } = renderHook(
      ({ onSubmit }) => useKeyboardSubmit({ onSubmit }),
      { initialProps: { onSubmit: onSubmit1 } }
    );

    rerender({ onSubmit: onSubmit2 });

    // Get the latest registered handler
    const keydownHandler = findLatestKeydownHandler(addEventListenerSpy);

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      metaKey: true,
      bubbles: true,
    });

    keydownHandler!(event);

    expect(onSubmit2).toHaveBeenCalledTimes(1);
    expect(onSubmit1).not.toHaveBeenCalled();
  });
});

describe('isMacPlatform', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });

  it('should return true for Mac platform', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'MacIntel', userAgent: '' },
      configurable: true,
    });

    expect(isMacPlatform()).toBe(true);
  });

  it('should return true for Mac userAgent when platform is not available', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: '', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      configurable: true,
    });

    expect(isMacPlatform()).toBe(true);
  });

  it('should return false for Windows platform', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'Win32', userAgent: '' },
      configurable: true,
    });

    expect(isMacPlatform()).toBe(false);
  });

  it('should return false for Linux platform', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'Linux x86_64', userAgent: '' },
      configurable: true,
    });

    expect(isMacPlatform()).toBe(false);
  });
});

describe('getSubmitShortcutHint', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });

  it('should return Mac shortcut hint on Mac', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'MacIntel', userAgent: '' },
      configurable: true,
    });

    expect(getSubmitShortcutHint()).toBe('⌘↵');
  });

  it('should return Windows/Linux shortcut hint on non-Mac platforms', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'Win32', userAgent: '' },
      configurable: true,
    });

    expect(getSubmitShortcutHint()).toBe('Ctrl+↵');
  });
});
