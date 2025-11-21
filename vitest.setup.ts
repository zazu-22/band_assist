import '@testing-library/jest-dom';

// Mock AlphaTab global
global.window.alphaTab = {
  AlphaTabApi: vi.fn(),
  midi: {
    MidiEventType: {
      AlphaTabMetronome: 1,
    },
  },
} as any;
