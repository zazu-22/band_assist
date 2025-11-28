import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PracticeControlBar } from './PracticeControlBar';
import type { Song, SongChart } from '@/types';
import type { TrackInfo, PlaybackState, MetronomeState } from './types';

// Mock data factories
const createMockSong = (overrides: Partial<Song> = {}): Song => ({
  id: 'song-1',
  title: 'Test Song',
  artist: 'Test Artist',
  bpm: 120,
  key: 'C',
  duration: '3:30',
  status: 'In Progress',
  isOriginal: false,
  charts: [],
  parts: [],
  assignments: [],
  ...overrides,
});

const createMockChart = (overrides: Partial<SongChart> = {}): SongChart => ({
  id: 'chart-1',
  name: 'Lead Sheet',
  instrument: 'Guitar',
  type: 'TEXT',
  content: 'Test content',
  ...overrides,
});

const createMockTrack = (overrides: Partial<TrackInfo> = {}): TrackInfo => ({
  index: 0,
  name: 'Guitar',
  isMute: false,
  isSolo: false,
  volume: 1.0,
  ...overrides,
});

const createMockPlaybackState = (overrides: Partial<PlaybackState> = {}): PlaybackState => ({
  isPlaying: false,
  isLooping: false,
  currentTime: 60000,
  totalTime: 180000,
  currentBPM: 120,
  originalTempo: 120,
  currentSpeed: 1.0,
  metronomeBeat: 0,
  ...overrides,
});

const createMockMetronomeState = (overrides: Partial<MetronomeState> = {}): MetronomeState => ({
  bpm: 120,
  isActive: false,
  ...overrides,
});

describe('PracticeControlBar', () => {
  const defaultProps = {
    song: createMockSong(),
    showSongList: true,
    onToggleSongList: vi.fn(),
    charts: [createMockChart()],
    activeChartId: 'chart-1',
    onSelectChart: vi.fn(),
    isGuitarPro: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders control bar container', () => {
      render(<PracticeControlBar {...defaultProps} />);
      expect(screen.getByTestId('practice-control-bar')).toBeInTheDocument();
    });

    it('renders song title when song is provided', () => {
      render(<PracticeControlBar {...defaultProps} />);
      expect(screen.getByText('Test Song')).toBeInTheDocument();
    });

    it('renders placeholder when no song is selected', () => {
      render(<PracticeControlBar {...defaultProps} song={null} />);
      expect(screen.getByText('Select a Song')).toBeInTheDocument();
    });

    it('renders song BPM', () => {
      render(<PracticeControlBar {...defaultProps} />);
      expect(screen.getByText('120 BPM')).toBeInTheDocument();
    });

    it('renders song key when available', () => {
      render(<PracticeControlBar {...defaultProps} />);
      expect(screen.getByText('Key of C')).toBeInTheDocument();
    });

    it('does not render key when song has no key', () => {
      render(<PracticeControlBar {...defaultProps} song={createMockSong({ key: '' })} />);
      expect(screen.queryByText('Key of')).not.toBeInTheDocument();
    });
  });

  describe('song list toggle', () => {
    it('renders toggle button', () => {
      render(<PracticeControlBar {...defaultProps} />);
      expect(screen.getByTestId('toggle-button')).toBeInTheDocument();
    });

    it('calls onToggleSongList when toggle button is clicked', () => {
      const onToggleSongList = vi.fn();
      render(<PracticeControlBar {...defaultProps} onToggleSongList={onToggleSongList} />);
      fireEvent.click(screen.getByTestId('toggle-button'));
      expect(onToggleSongList).toHaveBeenCalledTimes(1);
    });

    it('shows correct aria-label when song list is shown', () => {
      render(<PracticeControlBar {...defaultProps} showSongList={true} />);
      expect(screen.getByLabelText('Hide song list')).toBeInTheDocument();
    });

    it('shows correct aria-label when song list is hidden', () => {
      render(<PracticeControlBar {...defaultProps} showSongList={false} />);
      expect(screen.getByLabelText('Show song list')).toBeInTheDocument();
    });

    it('applies active styling when song list is shown', () => {
      render(<PracticeControlBar {...defaultProps} showSongList={true} />);
      const toggleButton = screen.getByTestId('toggle-button');
      expect(toggleButton).toHaveClass('bg-muted');
    });
  });

  describe('chart tabs', () => {
    it('renders ChartTabs component', () => {
      render(<PracticeControlBar {...defaultProps} />);
      expect(screen.getByTestId('chart-tabs')).toBeInTheDocument();
    });

    it('passes charts to ChartTabs', () => {
      const charts = [
        createMockChart({ id: 'c1', name: 'Chart 1' }),
        createMockChart({ id: 'c2', name: 'Chart 2' }),
      ];
      render(<PracticeControlBar {...defaultProps} charts={charts} />);
      expect(screen.getByText('Chart 1')).toBeInTheDocument();
      expect(screen.getByText('Chart 2')).toBeInTheDocument();
    });

    it('calls onSelectChart when chart is selected', () => {
      const onSelectChart = vi.fn();
      const charts = [
        createMockChart({ id: 'c1', name: 'Chart 1' }),
        createMockChart({ id: 'c2', name: 'Chart 2' }),
      ];
      render(
        <PracticeControlBar {...defaultProps} charts={charts} onSelectChart={onSelectChart} />
      );
      fireEvent.click(screen.getByText('Chart 2'));
      expect(onSelectChart).toHaveBeenCalledWith('c2');
    });
  });

  describe('Guitar Pro mode', () => {
    const gpProps = {
      ...defaultProps,
      isGuitarPro: true,
      charts: [createMockChart({ type: 'GP', name: 'Guitar Pro' })],
      playbackState: createMockPlaybackState(),
      tracks: [createMockTrack()],
      currentTrackIndex: 0,
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onStop: vi.fn(),
      onSeek: vi.fn(),
      onToggleLoop: vi.fn(),
      onSetBPM: vi.fn(),
      onResetTempo: vi.fn(),
      onSelectTrack: vi.fn(),
      onToggleTrackMute: vi.fn(),
      onToggleTrackSolo: vi.fn(),
    };

    it('renders PlaybackControls in GP mode', () => {
      render(<PracticeControlBar {...gpProps} />);
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    });

    it('renders TrackSelector in GP mode', () => {
      render(<PracticeControlBar {...gpProps} />);
      expect(screen.getByTestId('track-selector')).toBeInTheDocument();
    });

    it('renders MetronomeIndicator in GP mode', () => {
      render(<PracticeControlBar {...gpProps} />);
      expect(screen.getByTestId('metronome-indicator')).toBeInTheDocument();
    });

    it('renders ProgressBar when totalTime > 0', () => {
      render(<PracticeControlBar {...gpProps} />);
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('does not render ProgressBar when totalTime is 0', () => {
      render(
        <PracticeControlBar
          {...gpProps}
          playbackState={createMockPlaybackState({ totalTime: 0 })}
        />
      );
      expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
    });

    it('calls onPlay when play button is clicked', () => {
      const onPlay = vi.fn();
      render(<PracticeControlBar {...gpProps} onPlay={onPlay} />);
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
      expect(onPlay).toHaveBeenCalledTimes(1);
    });

    it('calls onPause when pause button is clicked', () => {
      const onPause = vi.fn();
      render(
        <PracticeControlBar
          {...gpProps}
          playbackState={createMockPlaybackState({ isPlaying: true })}
          onPause={onPause}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
      expect(onPause).toHaveBeenCalledTimes(1);
    });

    it('calls onStop when stop button is clicked', () => {
      const onStop = vi.fn();
      render(<PracticeControlBar {...gpProps} onStop={onStop} />);
      fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
      expect(onStop).toHaveBeenCalledTimes(1);
    });

    it('calls onToggleLoop when loop button is clicked', () => {
      const onToggleLoop = vi.fn();
      render(<PracticeControlBar {...gpProps} onToggleLoop={onToggleLoop} />);
      fireEvent.click(screen.getByRole('button', { name: 'Enable loop' }));
      expect(onToggleLoop).toHaveBeenCalledTimes(1);
    });
  });

  describe('non-GP mode with metronome', () => {
    const nonGpProps = {
      ...defaultProps,
      isGuitarPro: false,
      metronomeState: createMockMetronomeState(),
      onMetronomeBpmChange: vi.fn(),
      onMetronomeToggle: vi.fn(),
    };

    it('renders metronome toggle button', () => {
      render(<PracticeControlBar {...nonGpProps} />);
      expect(screen.getByLabelText('Start metronome')).toBeInTheDocument();
    });

    it('calls onMetronomeToggle when metronome button is clicked', () => {
      const onMetronomeToggle = vi.fn();
      render(<PracticeControlBar {...nonGpProps} onMetronomeToggle={onMetronomeToggle} />);
      fireEvent.click(screen.getByLabelText('Start metronome'));
      expect(onMetronomeToggle).toHaveBeenCalledTimes(1);
    });

    it('shows stop metronome when active', () => {
      render(
        <PracticeControlBar
          {...nonGpProps}
          metronomeState={createMockMetronomeState({ isActive: true })}
        />
      );
      expect(screen.getByLabelText('Stop metronome')).toBeInTheDocument();
    });

    it('renders BPM slider for metronome', () => {
      render(<PracticeControlBar {...nonGpProps} />);
      const slider = screen.getByLabelText('Metronome BPM');
      expect(slider).toBeInTheDocument();
    });

    it('calls onMetronomeBpmChange when slider is changed', () => {
      const onMetronomeBpmChange = vi.fn();
      render(<PracticeControlBar {...nonGpProps} onMetronomeBpmChange={onMetronomeBpmChange} />);
      const slider = screen.getByLabelText('Metronome BPM');
      fireEvent.change(slider, { target: { value: '140' } });
      expect(onMetronomeBpmChange).toHaveBeenCalledWith(140);
    });

    it('displays current metronome BPM', () => {
      render(
        <PracticeControlBar
          {...nonGpProps}
          metronomeState={createMockMetronomeState({ bpm: 100 })}
        />
      );
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('does not render PlaybackControls', () => {
      render(<PracticeControlBar {...nonGpProps} />);
      expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument();
    });

    it('does not render ProgressBar', () => {
      render(<PracticeControlBar {...nonGpProps} />);
      expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
    });
  });

  describe('conditional rendering', () => {
    it('does not render PlaybackControls without required props', () => {
      render(
        <PracticeControlBar
          {...defaultProps}
          isGuitarPro={true}
          playbackState={createMockPlaybackState()}
          // Missing onPlay, onPause, etc.
        />
      );
      expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument();
    });

    it('does not render TrackSelector without required props', () => {
      render(
        <PracticeControlBar
          {...defaultProps}
          isGuitarPro={true}
          playbackState={createMockPlaybackState()}
          tracks={[createMockTrack()]}
          currentTrackIndex={0}
          // Missing track control callbacks
        />
      );
      expect(screen.queryByTestId('track-selector')).not.toBeInTheDocument();
    });

    it('does not render TempoControl without required props', () => {
      render(
        <PracticeControlBar
          {...defaultProps}
          isGuitarPro={true}
          playbackState={createMockPlaybackState()}
          // Missing onSetBPM and onResetTempo
        />
      );
      expect(screen.queryByTestId('bpm-slider')).not.toBeInTheDocument();
    });

    it('does not render metronome controls without metronomeState', () => {
      render(
        <PracticeControlBar
          {...defaultProps}
          isGuitarPro={false}
          // No metronomeState
        />
      );
      expect(screen.queryByLabelText('Start metronome')).not.toBeInTheDocument();
    });
  });

  describe('song info display', () => {
    it('does not show key separator when no key', () => {
      render(<PracticeControlBar {...defaultProps} song={createMockSong({ key: '' })} />);
      const separator = screen.queryByText('•');
      expect(separator).not.toBeInTheDocument();
    });

    it('truncates long song titles', () => {
      const longTitle = 'This is a very long song title that should be truncated';
      render(<PracticeControlBar {...defaultProps} song={createMockSong({ title: longTitle })} />);
      const titleElement = screen.getByText(longTitle);
      expect(titleElement).toHaveClass('truncate');
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(PracticeControlBar.displayName).toBe('PracticeControlBar');
    });
  });
});
