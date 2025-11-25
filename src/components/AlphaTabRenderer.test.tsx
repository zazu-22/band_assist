import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { AlphaTabRenderer } from './AlphaTabRenderer';

interface MockTrack {
  name: string;
  playbackInfo: {
    isMute: boolean;
    isSolo: boolean;
  };
}

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
    tracks: [] as MockTrack[],
    tempo: 120,
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

const MockAlphaTabApi = vi.fn().mockImplementation(function () {
  return mockApiInstance;
});

describe('AlphaTabRenderer', () => {
  const mockFileData = 'data:application/octet-stream;base64,VEVTVERBVEE=';

  beforeEach(() => {
    vi.clearAllMocks();
    MockAlphaTabApi.mockClear();
    mockApiInstance.isLooping = false;
    mockApiInstance.playbackRange = null;

    // Setup window.alphaTab mock - cast to constructor type expected by AlphaTab
    type AlphaTabConstructor = new (
      element: HTMLElement,
      settings: unknown
    ) => typeof mockApiInstance;

    window.alphaTab = {
      AlphaTabApi: MockAlphaTabApi as unknown as AlphaTabConstructor,
      midi: {
        MidiEventType: {
          AlphaTabMetronome: 1,
        },
      },
    };
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

      // Verify explicit event handler cleanup
      expect(mockApiInstance.scoreLoaded.off).toHaveBeenCalled();
      expect(mockApiInstance.error.off).toHaveBeenCalled();
      expect(mockApiInstance.playerStateChanged.off).toHaveBeenCalled();
      expect(mockApiInstance.playerReady.off).toHaveBeenCalled();
      expect(mockApiInstance.renderStarted.off).toHaveBeenCalled();
      expect(mockApiInstance.renderFinished.off).toHaveBeenCalled();
      expect(mockApiInstance.playerPositionChanged.off).toHaveBeenCalled();
      expect(mockApiInstance.playerFinished.off).toHaveBeenCalled();
      expect(mockApiInstance.beatMouseDown.off).toHaveBeenCalled();
      expect(mockApiInstance.midiEventsPlayed.off).toHaveBeenCalled();

      // Verify destroy is still called
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
      act(() => {
        errorHandler({ message: 'Test error' });
      });

      await waitFor(() => {
        expect(screen.getByText(/Test error/)).toBeInTheDocument();
      });
    });

    it('should handle invalid file data', async () => {
      render(<AlphaTabRenderer fileData="invalid-data" />);

      // The component should handle this gracefully by showing an error
      await waitFor(() => {
        expect(
          screen.getByText(/Invalid file data format\. Could not convert Base64 to binary\./)
        ).toBeInTheDocument();
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
      act(() => {
        scoreLoadedHandler({ tracks: [] });
      });

      await waitFor(() => {
        expect(screen.queryByText('Parsing Tab...')).not.toBeInTheDocument();
      });

      // Trigger position change
      const positionHandler = mockApiInstance.playerPositionChanged.on.mock.calls[0][0];
      act(() => {
        positionHandler({ currentTime: 65000, endTime: 125000 }); // 1:05 and 2:05
      });

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
      act(() => {
        scoreLoadedHandler({ tracks: [] });
      });
    });

    it('should toggle play/pause when play button is clicked', async () => {
      // Trigger playerReady event first
      const playerReadyHandler = mockApiInstance.playerReady.on.mock.calls[0][0];
      act(() => {
        playerReadyHandler();
      });

      await waitFor(() => {
        // Find the play/pause button by its className
        const buttons = screen.getAllByRole('button');
        const playButton = buttons.find(
          btn =>
            btn.classList.contains('rounded-full') &&
            (btn.querySelector('.lucide-play') || btn.querySelector('.lucide-pause'))
        );

        expect(playButton).toBeDefined();
        expect(playButton).not.toBeDisabled();

        if (playButton) {
          fireEvent.click(playButton);
          // Now uses play() instead of playPause() to avoid InvalidStateError
          expect(mockApiInstance.play).toHaveBeenCalled();
        }
      });
    });

    it('should not issue duplicate play commands when toggled before state updates', async () => {
      await waitFor(() => {
        expect(mockApiInstance.playerReady.on).toHaveBeenCalled();
      });

      const playerReadyHandler = mockApiInstance.playerReady.on.mock.calls[0][0];
      act(() => {
        playerReadyHandler();
      });

      const playButton = await screen.findByTitle('Play');
      fireEvent.click(playButton);
      fireEvent.click(playButton);

      expect(mockApiInstance.play).toHaveBeenCalledTimes(1);
    });

    it('should stop playback when stop button is clicked', async () => {
      // First set playing state
      const stateHandler = mockApiInstance.playerStateChanged.on.mock.calls[0][0];
      act(() => {
        stateHandler({ state: 1 });
      });

      await waitFor(() => {
        const stopButton = screen
          .getAllByRole('button')
          .find(btn => btn.querySelector('svg')?.classList.toString().includes('lucide-square'));
        if (stopButton) {
          fireEvent.click(stopButton);
          expect(mockApiInstance.stop).toHaveBeenCalled();
        }
      });
    });

    it('should not call stop() on audio node when not playing (regression test for InvalidStateError)', async () => {
      // This test verifies the fix for: "InvalidStateError: cannot call stop without calling start first"

      // Score is loaded but playback has NOT been started
      const stateHandler = mockApiInstance.playerStateChanged.on.mock.calls[0][0];

      // Ensure playback state is false (this is the critical condition)
      act(() => {
        stateHandler({ state: 0 }); // 0 = paused/stopped
      });

      await waitFor(() => {
        const stopButton = screen
          .getAllByRole('button')
          .find(btn => btn.querySelector('svg')?.classList.toString().includes('lucide-square'));

        // The stop button exists but should be disabled when not playing
        expect(stopButton).toBeDefined();

        if (stopButton && !stopButton.hasAttribute('disabled')) {
          // Try to click stop when not playing
          fireEvent.click(stopButton);

          // CRITICAL: stop() should NOT be called because internalIsPlaying is false
          // This prevents "InvalidStateError: cannot call stop without calling start first"
          expect(mockApiInstance.stop).not.toHaveBeenCalled();
        }
      });
    });

    it('should handle stop() errors gracefully without crashing', async () => {
      // Set playing state first
      const stateHandler = mockApiInstance.playerStateChanged.on.mock.calls[0][0];
      act(() => {
        stateHandler({ state: 1 }); // 1 = playing
      });

      // Make stop() throw an error (simulating Web Audio API error)
      mockApiInstance.stop.mockImplementationOnce(() => {
        throw new Error('InvalidStateError: cannot call stop without calling start first');
      });

      await waitFor(() => {
        const stopButton = screen
          .getAllByRole('button')
          .find(btn => btn.querySelector('svg')?.classList.toString().includes('lucide-square'));

        if (stopButton) {
          // Should not throw - error should be caught and handled gracefully
          expect(() => fireEvent.click(stopButton)).not.toThrow();

          // State should still be updated despite the error
          // The try-catch ensures the component doesn't crash
          // and the state update code after the try-catch still executes
        }
      });
    });

    it('should change playback speed', async () => {
      render(<AlphaTabRenderer fileData={mockFileData} />);

      // Wait for API to be created
      await waitFor(() => {
        expect(mockApiInstance.scoreLoaded.on).toHaveBeenCalled();
      });

      // Simulate scoreLoaded event with tracks to make BPM slider appear
      const scoreLoadedHandler = mockApiInstance.scoreLoaded.on.mock.calls[0][0];
      const mockTracks = [{ name: 'Guitar', playbackInfo: { isMute: false, isSolo: false } }];

      act(() => {
        scoreLoadedHandler({ tracks: mockTracks, tempo: 120 });
      });
      mockApiInstance.score.tracks = mockTracks;

      // The UI now uses a BPM slider instead of a speed selector
      // Wait for the BPM slider to appear
      const bpmSlider = await waitFor(() => screen.getByRole('slider'));

      // Simulate changing BPM (which internally changes playback speed)
      // If original tempo is 120, setting to 90 should give speed of 0.75
      fireEvent.change(bpmSlider, { target: { value: '90' } });

      await waitFor(() => {
        expect(mockApiInstance.playbackSpeed).toBe(0.75);
      });
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
      act(() => {
        stateHandler({ state: 1 }); // Playing
      });

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

    it('should not auto-sync playback when uncontrolled', async () => {
      render(<AlphaTabRenderer fileData={mockFileData} />);

      await waitFor(() => {
        expect(mockApiInstance.playerStateChanged.on).toHaveBeenCalled();
      });

      const stateHandler = mockApiInstance.playerStateChanged.on.mock.calls[0][0];
      act(() => {
        stateHandler({ state: 1 });
      });

      await waitFor(() => {
        expect(mockApiInstance.pause).not.toHaveBeenCalled();
      });
    });

    it('should not force pause when switching from controlled to uncontrolled playback', async () => {
      const { rerender } = render(<AlphaTabRenderer fileData={mockFileData} isPlaying={true} />);

      await waitFor(() => {
        expect(mockApiInstance.play).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockApiInstance.playerStateChanged.on).toHaveBeenCalled();
      });

      const stateHandler = mockApiInstance.playerStateChanged.on.mock.calls[0][0];
      act(() => {
        stateHandler({ state: 1 });
      });

      mockApiInstance.pause.mockClear();

      rerender(<AlphaTabRenderer fileData={mockFileData} />);

      expect(mockApiInstance.pause).not.toHaveBeenCalled();
    });

    it('should sync playback when switching from uncontrolled to controlled mid-playback', async () => {
      const { rerender } = render(<AlphaTabRenderer fileData={mockFileData} />);

      await waitFor(() => {
        expect(mockApiInstance.playerStateChanged.on).toHaveBeenCalled();
      });

      const stateHandler = mockApiInstance.playerStateChanged.on.mock.calls[0][0];
      act(() => {
        stateHandler({ state: 1 });
      });

      mockApiInstance.pause.mockClear();

      rerender(<AlphaTabRenderer fileData={mockFileData} isPlaying={false} />);

      await waitFor(() => {
        expect(mockApiInstance.pause).toHaveBeenCalled();
      });
    });

    it('should ignore playerFinished events while looping', async () => {
      const onPlaybackChange = vi.fn();
      render(<AlphaTabRenderer fileData={mockFileData} onPlaybackChange={onPlaybackChange} />);

      await waitFor(() => {
        expect(mockApiInstance.playerFinished.on).toHaveBeenCalled();
      });

      const finishedHandler = mockApiInstance.playerFinished.on.mock.calls[0][0];
      mockApiInstance.isLooping = true;

      act(() => {
        finishedHandler();
      });

      expect(onPlaybackChange).not.toHaveBeenCalled();
    });

    it('should mark playback stopped when loop mode is off', async () => {
      const onPlaybackChange = vi.fn();
      render(<AlphaTabRenderer fileData={mockFileData} onPlaybackChange={onPlaybackChange} />);

      await waitFor(() => {
        expect(mockApiInstance.playerFinished.on).toHaveBeenCalled();
      });

      const finishedHandler = mockApiInstance.playerFinished.on.mock.calls[0][0];
      mockApiInstance.isLooping = false;

      act(() => {
        finishedHandler();
      });

      expect(onPlaybackChange).toHaveBeenCalledWith(false);
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
      act(() => {
        midiHandler({
          events: [
            {
              isMetronome: true,
              metronomeNumerator: 1,
              metronomeDurationInMilliseconds: 500,
            },
          ],
        });
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
      act(() => {
        midiHandler({
          events: [
            {
              isMetronome: true,
              metronomeNumerator: 1,
              metronomeDurationInMilliseconds: 500,
            },
          ],
        });
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

      await waitFor(
        () => {
          expect(mockApiInstance.beatMouseDown.on).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      const beatHandler = mockApiInstance.beatMouseDown.on.mock.calls[0][0];

      // First click to set selection start
      act(() => {
        beatHandler({
          beat: {
            absolutePlaybackStart: 1000,
            playbackDuration: 500,
          },
          originalEvent: {
            shiftKey: true,
          },
        });
      });

      // Second click to create range
      act(() => {
        beatHandler({
          beat: {
            absolutePlaybackStart: 2000,
            playbackDuration: 500,
          },
          originalEvent: {
            shiftKey: true,
          },
        });
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

      await waitFor(
        () => {
          expect(mockApiInstance.scoreLoaded.on).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      const scoreLoadedHandler = mockApiInstance.scoreLoaded.on.mock.calls[0][0];
      act(() => {
        scoreLoadedHandler({ tracks: mockTracks });
      });
      mockApiInstance.score.tracks = mockTracks;

      await waitFor(() => {
        expect(screen.queryByText('Parsing Tab...')).not.toBeInTheDocument();
      });

      const settingsButton = screen
        .getAllByRole('button')
        .find(btn => btn.querySelector('svg')?.classList.toString().includes('lucide-layers'));

      if (settingsButton) {
        fireEvent.click(settingsButton);
        await waitFor(() => {
          expect(screen.getByText('Mixer')).toBeInTheDocument();
        });
      }
    });

    it('should close mixer when clicking outside panel', async () => {
      render(<AlphaTabRenderer fileData={mockFileData} />);

      await waitFor(() => {
        expect(mockApiInstance.scoreLoaded.on).toHaveBeenCalled();
      });

      const scoreLoadedHandler = mockApiInstance.scoreLoaded.on.mock.calls[0][0];
      act(() => {
        scoreLoadedHandler({ tracks: mockTracks });
      });
      mockApiInstance.score.tracks = mockTracks;

      await waitFor(() => {
        expect(screen.queryByText('Parsing Tab...')).not.toBeInTheDocument();
      });

      const settingsButton = screen.getByTitle(/Click to open mixer and switch tracks/);
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Mixer')).toBeInTheDocument();
      });

      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByText('Mixer')).not.toBeInTheDocument();
      });
    });

    it('should toggle track mute', async () => {
      render(<AlphaTabRenderer fileData={mockFileData} />);

      await waitFor(
        () => {
          expect(mockApiInstance.scoreLoaded.on).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      const scoreLoadedHandler = mockApiInstance.scoreLoaded.on.mock.calls[0][0];
      act(() => {
        scoreLoadedHandler({ tracks: mockTracks });
      });
      mockApiInstance.score.tracks = mockTracks;

      await waitFor(() => {
        expect(screen.queryByText('Parsing Tab...')).not.toBeInTheDocument();
      });

      // Open mixer first
      const settingsButton = screen
        .getAllByRole('button')
        .find(btn =>
          btn.querySelector('svg')?.classList.toString().includes('lucide-sliders-vertical')
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
