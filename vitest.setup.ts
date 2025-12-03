import '@testing-library/jest-dom';

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
