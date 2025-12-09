import '@testing-library/jest-dom';

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Deferred promise type for controlling async test behavior.
 */
export interface DeferredPromise<T = void> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

/**
 * Creates a deferred promise that can be resolved or rejected externally.
 * Useful for testing async behavior where you need to control when a promise settles.
 *
 * @example
 * const deferred = createDeferredPromise<void>();
 * const onSubmit = vi.fn().mockImplementation(() => deferred.promise);
 * // ... trigger submission ...
 * deferred.resolve(); // or deferred.reject(new Error('...'))
 */
export function createDeferredPromise<T = void>(): DeferredPromise<T> {
  let resolve: (value: T | PromiseLike<T>) => void;
  let reject: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}

// Make it available globally for tests
// Note: Using `var` in declare global is the standard TypeScript pattern for global augmentation
declare global {
  // eslint-disable-next-line no-var
  var createDeferredPromise: <T = void>() => DeferredPromise<T>;
}

(globalThis as typeof globalThis & { createDeferredPromise: typeof createDeferredPromise }).createDeferredPromise = createDeferredPromise;

// Mock ResizeObserver for jsdom environment
class ResizeObserverMock {
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = ResizeObserverMock;

// Mock AlphaTab global - will be properly set up in individual test files
// This is just a placeholder to prevent undefined errors
interface WindowWithAlphaTab extends Window {
  alphaTab: {
    AlphaTabApi: ReturnType<typeof vi.fn>;
    midi: {
      MidiEventType: {
        AlphaTabMetronome: number;
      };
    };
  };
}

(global.window as unknown as WindowWithAlphaTab).alphaTab = {
  AlphaTabApi: vi.fn(),
  midi: {
    MidiEventType: {
      AlphaTabMetronome: 1,
    },
  },
};
