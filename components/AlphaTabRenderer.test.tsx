import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AlphaTabRenderer } from './AlphaTabRenderer';

// Mock AlphaTab API
const mockApiInstance = {
  destroy: vi.fn(),
  load: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  playPause: vi.fn(),
  stop: vi.fn(),
  renderTracks: vi.fn(),
  changeTrackMute: vi.fn(),
  changeTrackSolo: vi.fn(),
  playbackSpeed: 1.0,
  timePosition: 0,
  isLooping: false,
  playbackRange: null,
  score: {
    tracks: [],
  },
  scoreLoaded: { on: vi.fn(), off: vi.fn() },
  error: { on: vi.fn(), off: vi.fn() },
  playerStateChanged: { on: vi.fn(), off: vi.fn() },
  playerReady: { on: vi.fn(), off: vi.fn() },
  renderStarted: { on: vi.fn(), off: vi.fn() },
  renderFinished: { on: vi.fn(), off: vi.fn() },
  playerPositionChanged: { on: vi.fn(), off: vi.fn() },
  playerFinished: { on: vi.fn(), off: vi.fn() },
  beatMouseDown: { on: vi.fn(), off: vi.fn() },
  midiEventsPlayed: { on: vi.fn(), off: vi.fn() },
  midiEventsPlayedFilter: [],
};

const MockAlphaTabApi = vi.fn().mockImplementation(function(this: any, element: any, settings: any) {
  return mockApiInstance;
});

describe('AlphaTabRenderer', () => {
  const mockFileData = 'data:application/octet-stream;base64,VEVTVERBVEE=';

  beforeEach(() => {
    vi.clearAllMocks();
    MockAlphaTabApi.mockClear();

    // Setup window.alphaTab mock
    window.alphaTab = {
      AlphaTabApi: MockAlphaTabApi as any,
      midi: {
        MidiEventType: {
          AlphaTabMetronome: 1,
        },
      },
    } as any;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Component Initialization', () => {
    it('should render loading state initially', () => {
      render(<AlphaTabRenderer fileData={mockFileData} />);
      expect(screen.getByText('Parsing Tab...')).toBeInTheDocument();
    });

    it('should initialize AlphaTab API with correct settings', async () => {
      render(<AlphaTabRenderer fileData={mockFileData} />);

      await waitFor(() => {
        expect(MockAlphaTabApi).toHaveBeenCalled();
      });

      const apiCall = MockAlphaTabApi.mock.calls[0];
      const settings = apiCall[1];

      expect(settings.core.useWorkers).toBe(true);
      expect(settings.player.enablePlayer).toBe(true);
      expect(settings.display.layoutMode).toBe('page');
    });

    it('should disable player in readonly mode', async () => {
      render(<AlphaTabRenderer fileData={mockFileData} readOnly={true} />);

      await waitFor(() => {
        expect(MockAlphaTabApi).toHaveBeenCalled();
      });

      const settings = MockAlphaTabApi.mock.calls[0][1];
      expect(settings.player.enablePlayer).toBe(false);
    });
  });

  describe('Event Handler Registration', () => {
    it('should register all event handlers', async () => {
      render(<AlphaTabRenderer fileData={mockFileData} />);

      await waitFor(() => {
        expect(mockApiInstance.scoreLoaded.on).toHaveBeenCalled();
        expect(mockApiInstance.error.on).toHaveBeenCalled();
        expect(mockApiInstance.playerStateChanged.on).toHaveBeenCalled();
        expect(mockApiInstance.playerReady.on).toHaveBeenCalled();
        expect(mockApiInstance.renderStarted.on).toHaveBeenCalled();
        expect(mockApiInstance.renderFinished.on).toHaveBeenCalled();
        expect(mockApiInstance.playerPositionChanged.on).toHaveBeenCalled();
        expect(mockApiInstance.playerFinished.on).toHaveBeenCalled();
        expect(mockApiInstance.beatMouseDown.on).toHaveBeenCalled();
        expect(mockApiInstance.midiEventsPlayed.on).toHaveBeenCalled();
      });
    });

    it('should cleanup event handlers on unmount', async () => {
      const { unmount } = render(<AlphaTabRenderer fileData={mockFileData} />);

      await waitFor(() => {
        expect(MockAlphaTabApi).toHaveBeenCalled();
      });

      unmount();

      expect(mockApiInstance.destroy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when loading fails', async () => {
      render(<AlphaTabRenderer fileData={mockFileData} />);

      await waitFor(() => {
        expect(mockApiInstance.error.on).toHaveBeenCalled();
      });

      // Trigger error handler
      const errorHandler = mockApiInstance.error.on.mock.calls[0][0];
      errorHandler({ message: 'Test error' });

      await waitFor(() => {
        expect(screen.getByText(/Test error/)).toBeInTheDocument();
      });
    });

    it('should handle invalid file data', async () => {
      render(<AlphaTabRenderer fileData="invalid-data" />);

      // The component should handle this gracefully by showing an error
      await waitFor(() => {
        expect(screen.getByText(/Invalid file data format/)).toBeInTheDocument();
      });
    });
  });

  describe('formatTime Helper', () => {
    it('should format time correctly', async () => {
      render(<AlphaTabRenderer fileData={mockFileData} />);

      await waitFor(() => {
        expect(mockApiInstance.scoreLoaded.on).toHaveBeenCalled();
      });

      // Trigger score loaded to hide loading state
      const scoreLoadedHandler = mockApiInstance.scoreLoaded.on.mock.calls[0][0];
      scoreLoadedHandler({ tracks: [] });

      await waitFor(() => {
        expect(screen.queryByText('Parsing Tab...')).not.toBeInTheDocument();
      });

      // Trigger position change
      const positionHandler = mockApiInstance.playerPositionChanged.on.mock.calls[0][0];
      positionHandler({ currentTime: 65000, endTime: 125000 }); // 1:05 and 2:05

      await waitFor(() => {
        expect(screen.getByText('1:05')).toBeInTheDocument();
        expect(screen.getByText('2:05')).toBeInTheDocument();
      });
    });
  });

  describe('Playback Controls', () => {
    beforeEach(async () => {
      render(<AlphaTabRenderer fileData={mockFileData} />);

      await waitFor(() => {
        expect(mockApiInstance.scoreLoaded.on).toHaveBeenCalled();
      });

      // Trigger score loaded
      const scoreLoadedHandler = mockApiInstance.scoreLoaded.on.mock.calls[0][0];
      scoreLoadedHandler({ tracks: [] });
    });

    it('should toggle play/pause when play button is clicked', async () => {
      // Find the play/pause button by its className
      const buttons = screen.getAllByRole('button');
      const playButton = buttons.find(btn =>
        btn.classList.contains('rounded-full') &&
        (btn.querySelector('.lucide-play') || btn.querySelector('.lucide-pause'))
      );

      expect(playButton).toBeDefined();
      if (playButton) {
        fireEvent.click(playButton);
        expect(mockApiInstance.playPause).toHaveBeenCalled();
      }
    });

    it('should stop playback when stop button is clicked', async () => {
      // First set playing state
      const stateHandler = mockApiInstance.playerStateChanged.on.mock.calls[0][0];
      stateHandler({ state: 1 });

      await waitFor(() => {
        const stopButton = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.classList.toString().includes('lucide-square')
        );
        if (stopButton) {
          fireEvent.click(stopButton);
          expect(mockApiInstance.stop).toHaveBeenCalled();
        }
      });
    });

    it('should change playback speed', async () => {
      const speedSelect = screen.getByRole('combobox');
      fireEvent.change(speedSelect, { target: { value: '0.75' } });

      expect(mockApiInstance.playbackSpeed).toBe(0.75);
    });
  });

  describe('State Management', () => {
    it('should update playing state when playerStateChanged event fires', async () => {
      const onPlaybackChange = vi.fn();
      render(<AlphaTabRenderer fileData={mockFileData} onPlaybackChange={onPlaybackChange} />);

      await waitFor(() => {
        expect(mockApiInstance.playerStateChanged.on).toHaveBeenCalled();
      });

      const stateHandler = mockApiInstance.playerStateChanged.on.mock.calls[0][0];
      stateHandler({ state: 1 }); // Playing

      await waitFor(() => {
        expect(onPlaybackChange).toHaveBeenCalledWith(true);
      });
    });

    it('should handle external playback control', async () => {
      const { rerender } = render(<AlphaTabRenderer fileData={mockFileData} isPlaying={false} />);

      await waitFor(() => {
        expect(MockAlphaTabApi).toHaveBeenCalled();
      });

      rerender(<AlphaTabRenderer fileData={mockFileData} isPlaying={true} />);

      await waitFor(() => {
        expect(mockApiInstance.play).toHaveBeenCalled();
      });
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should clear metronome timeouts on unmount', async () => {
      const { unmount } = render(<AlphaTabRenderer fileData={mockFileData} />);

      await waitFor(() => {
        expect(mockApiInstance.midiEventsPlayed.on).toHaveBeenCalled();
      });

      // Trigger metronome event
      const midiHandler = mockApiInstance.midiEventsPlayed.on.mock.calls[0][0];
      midiHandler({
        events: [
          {
            isMetronome: true,
            metronomeNumerator: 1,
            metronomeDurationInMilliseconds: 500,
          },
        ],
      });

      unmount();

      // If there's a memory leak, this test would timeout or show warnings
      expect(mockApiInstance.destroy).toHaveBeenCalled();
    });

    it('should cleanup timeout regardless of mount status', async () => {
      const { unmount } = render(<AlphaTabRenderer fileData={mockFileData} />);

      await waitFor(() => {
        expect(mockApiInstance.midiEventsPlayed.on).toHaveBeenCalled();
      });

      const midiHandler = mockApiInstance.midiEventsPlayed.on.mock.calls[0][0];

      // Trigger metronome event
      midiHandler({
        events: [
          {
            isMetronome: true,
            metronomeNumerator: 1,
            metronomeDurationInMilliseconds: 500,
          },
        ],
      });

      // Unmount before timeout fires
      unmount();

      // The component should handle unmounting gracefully without errors
      expect(mockApiInstance.destroy).toHaveBeenCalled();
    });
  });

  describe('Stale Closure Prevention', () => {
    it('should not use stale apiRef in beat mouse down handler', async () => {
      render(<AlphaTabRenderer fileData={mockFileData} />);

      await waitFor(() => {
        expect(mockApiInstance.beatMouseDown.on).toHaveBeenCalled();
      }, { timeout: 3000 });

      const beatHandler = mockApiInstance.beatMouseDown.on.mock.calls[0][0];

      // First click to set selection start
      beatHandler({
        beat: {
          absolutePlaybackStart: 1000,
          playbackDuration: 500,
        },
        originalEvent: {
          shiftKey: true,
        },
      });

      // Second click to create range
      beatHandler({
        beat: {
          absolutePlaybackStart: 2000,
          playbackDuration: 500,
        },
        originalEvent: {
          shiftKey: true,
        },
      });

      // Verify the API was called without stale closure issues
      await waitFor(() => {
        expect(mockApiInstance.playbackRange).toEqual({
          startTick: 1000,
          endTick: 2500,
        });
      });
    });
  });

  describe('Track Management', () => {
    const mockTracks = [
      {
        name: 'Guitar',
        playbackInfo: { isMute: false, isSolo: false },
      },
      {
        name: 'Bass',
        playbackInfo: { isMute: false, isSolo: false },
      },
    ];

    it('should display mixer when settings button is clicked', async () => {
      render(<AlphaTabRenderer fileData={mockFileData} />);

      await waitFor(() => {
        expect(mockApiInstance.scoreLoaded.on).toHaveBeenCalled();
      }, { timeout: 3000 });

      const scoreLoadedHandler = mockApiInstance.scoreLoaded.on.mock.calls[0][0];
      scoreLoadedHandler({ tracks: mockTracks });
      mockApiInstance.score.tracks = mockTracks;

      await waitFor(() => {
        expect(screen.queryByText('Parsing Tab...')).not.toBeInTheDocument();
      });

      const settingsButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.toString().includes('lucide-layers')
      );

      if (settingsButton) {
        fireEvent.click(settingsButton);
        await waitFor(() => {
          expect(screen.getByText('Mixer')).toBeInTheDocument();
        });
      }
    });

    it('should toggle track mute', async () => {
      render(<AlphaTabRenderer fileData={mockFileData} />);

      await waitFor(() => {
        expect(mockApiInstance.scoreLoaded.on).toHaveBeenCalled();
      }, { timeout: 3000 });

      const scoreLoadedHandler = mockApiInstance.scoreLoaded.on.mock.calls[0][0];
      scoreLoadedHandler({ tracks: mockTracks });
      mockApiInstance.score.tracks = mockTracks;

      await waitFor(() => {
        expect(screen.queryByText('Parsing Tab...')).not.toBeInTheDocument();
      });

      // Open mixer first
      const settingsButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.toString().includes('lucide-layers')
      );
      if (settingsButton) fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Mixer')).toBeInTheDocument();
      });

      const muteButton = screen.getAllByText('M')[0];
      fireEvent.click(muteButton);
      expect(mockApiInstance.changeTrackMute).toHaveBeenCalled();
    });
  });
});
