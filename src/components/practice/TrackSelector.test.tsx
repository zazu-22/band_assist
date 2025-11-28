import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrackSelector } from './TrackSelector';
import type { TrackInfo } from './types';

const createMockTrack = (overrides: Partial<TrackInfo> = {}): TrackInfo => ({
  index: 0,
  name: 'Acoustic Guitar',
  isMute: false,
  isSolo: false,
  volume: 1.0,
  ...overrides,
});

describe('TrackSelector', () => {
  const mockTracks: TrackInfo[] = [
    createMockTrack({ index: 0, name: 'Acoustic Guitar' }),
    createMockTrack({ index: 1, name: 'Electric Bass' }),
    createMockTrack({ index: 2, name: 'Drums' }),
  ];

  const defaultProps = {
    tracks: mockTracks,
    currentTrackIndex: 0,
    onSelectTrack: vi.fn(),
    onToggleMute: vi.fn(),
    onToggleSolo: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders track selector trigger button', () => {
      render(<TrackSelector {...defaultProps} />);
      expect(screen.getByTestId('track-selector')).toBeInTheDocument();
    });

    it('displays current track name in trigger', () => {
      render(<TrackSelector {...defaultProps} />);
      expect(screen.getByText('Acoustic Guitar')).toBeInTheDocument();
    });

    it('displays second track name when currentTrackIndex is 1', () => {
      render(<TrackSelector {...defaultProps} currentTrackIndex={1} />);
      expect(screen.getByText('Electric Bass')).toBeInTheDocument();
    });

    it('returns null when tracks array is empty', () => {
      const { container } = render(
        <TrackSelector {...defaultProps} tracks={[]} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('returns null when currentTrack does not exist', () => {
      const { container } = render(
        <TrackSelector {...defaultProps} currentTrackIndex={99} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('mute indicator', () => {
    it('shows primary dot when track is not muted', () => {
      render(<TrackSelector {...defaultProps} />);
      const trigger = screen.getByTestId('track-selector');
      const dot = trigger.querySelector('.bg-primary');
      expect(dot).toBeInTheDocument();
    });

    it('shows destructive dot when track is muted', () => {
      const mutedTracks = [
        createMockTrack({ index: 0, name: 'Muted Track', isMute: true }),
      ];
      render(<TrackSelector {...defaultProps} tracks={mutedTracks} />);
      const trigger = screen.getByTestId('track-selector');
      const dot = trigger.querySelector('.bg-destructive');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('trigger button', () => {
    it('has dropdown menu attributes', () => {
      render(<TrackSelector {...defaultProps} />);
      const trigger = screen.getByTestId('track-selector');
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('is a button element', () => {
      render(<TrackSelector {...defaultProps} />);
      const trigger = screen.getByTestId('track-selector');
      expect(trigger.tagName).toBe('BUTTON');
    });
  });

  describe('dropdown interactions', () => {
    it('opens dropdown when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(<TrackSelector {...defaultProps} />);

      const trigger = screen.getByTestId('track-selector');
      await user.click(trigger);

      // Dropdown content should be visible with all tracks
      await waitFor(() => {
        expect(screen.getByTestId('track-dropdown')).toBeInTheDocument();
      });
    });

    it('shows all tracks in dropdown', async () => {
      const user = userEvent.setup();
      render(<TrackSelector {...defaultProps} />);

      await user.click(screen.getByTestId('track-selector'));

      await waitFor(() => {
        expect(screen.getByText('Electric Bass')).toBeInTheDocument();
        expect(screen.getByText('Drums')).toBeInTheDocument();
      });
    });

    it('calls onSelectTrack when track is clicked', async () => {
      const user = userEvent.setup();
      const onSelectTrack = vi.fn();
      render(<TrackSelector {...defaultProps} onSelectTrack={onSelectTrack} />);

      await user.click(screen.getByTestId('track-selector'));

      await waitFor(() => {
        expect(screen.getByText('Electric Bass')).toBeInTheDocument();
      });

      // Click on the track name button (not the mute/solo buttons)
      const bassTrackButton = screen.getByText('Electric Bass').closest('button');
      await user.click(bassTrackButton!);

      expect(onSelectTrack).toHaveBeenCalledWith(1);
    });

    it('calls onToggleMute when mute button is clicked', async () => {
      const user = userEvent.setup();
      const onToggleMute = vi.fn();
      render(<TrackSelector {...defaultProps} onToggleMute={onToggleMute} />);

      await user.click(screen.getByTestId('track-selector'));

      await waitFor(() => {
        expect(screen.getByTestId('track-dropdown')).toBeInTheDocument();
      });

      // Find mute buttons by title
      const muteButtons = screen.getAllByTitle('Mute');
      // Click the first track's mute button
      await user.click(muteButtons[0]);

      expect(onToggleMute).toHaveBeenCalledWith(0);
    });

    it('calls onToggleSolo when solo button is clicked', async () => {
      const user = userEvent.setup();
      const onToggleSolo = vi.fn();
      render(<TrackSelector {...defaultProps} onToggleSolo={onToggleSolo} />);

      await user.click(screen.getByTestId('track-selector'));

      await waitFor(() => {
        expect(screen.getByTestId('track-dropdown')).toBeInTheDocument();
      });

      // Find solo buttons by title
      const soloButtons = screen.getAllByTitle('Solo');
      // Click the second track's solo button
      await user.click(soloButtons[1]);

      expect(onToggleSolo).toHaveBeenCalledWith(1);
    });

    it('shows unmute button when track is muted', async () => {
      const user = userEvent.setup();
      const tracksWithMuted = [
        createMockTrack({ index: 0, name: 'Muted Track', isMute: true }),
        createMockTrack({ index: 1, name: 'Normal Track', isMute: false }),
      ];
      render(<TrackSelector {...defaultProps} tracks={tracksWithMuted} />);

      await user.click(screen.getByTestId('track-selector'));

      await waitFor(() => {
        expect(screen.getByTitle('Unmute')).toBeInTheDocument();
      });
    });

    it('shows unsolo button when track is soloed', async () => {
      const user = userEvent.setup();
      const tracksWithSolo = [
        createMockTrack({ index: 0, name: 'Soloed Track', isSolo: true }),
        createMockTrack({ index: 1, name: 'Normal Track', isSolo: false }),
      ];
      render(<TrackSelector {...defaultProps} tracks={tracksWithSolo} />);

      await user.click(screen.getByTestId('track-selector'));

      await waitFor(() => {
        expect(screen.getByTitle('Unsolo')).toBeInTheDocument();
      });
    });

    it('highlights current track in dropdown', async () => {
      const user = userEvent.setup();
      render(<TrackSelector {...defaultProps} currentTrackIndex={1} />);

      await user.click(screen.getByTestId('track-selector'));

      await waitFor(() => {
        // Electric Bass appears twice: in trigger and dropdown
        // Find the one inside the dropdown menu item
        const bassTexts = screen.getAllByText('Electric Bass');
        const dropdownBass = bassTexts.find(el =>
          el.closest('[role="menuitem"]')
        );
        const bassItem = dropdownBass?.closest('[role="menuitem"]');
        expect(bassItem).toHaveClass('bg-muted');
      });
    });
  });

  describe('multiple tracks', () => {
    it('renders with many tracks', () => {
      const manyTracks = Array.from({ length: 10 }, (_, i) =>
        createMockTrack({ index: i, name: `Track ${i + 1}` })
      );
      render(<TrackSelector {...defaultProps} tracks={manyTracks} />);
      // First track should show in trigger
      expect(screen.getByText('Track 1')).toBeInTheDocument();
    });

    it('shows correct track when currentTrackIndex changes', () => {
      const manyTracks = Array.from({ length: 10 }, (_, i) =>
        createMockTrack({ index: i, name: `Track ${i + 1}` })
      );
      render(<TrackSelector {...defaultProps} tracks={manyTracks} currentTrackIndex={9} />);
      expect(screen.getByText('Track 10')).toBeInTheDocument();
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(TrackSelector.displayName).toBe('TrackSelector');
    });
  });
});
