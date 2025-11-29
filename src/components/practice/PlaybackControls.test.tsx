import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaybackControls } from './PlaybackControls';

describe('PlaybackControls', () => {
  const defaultProps = {
    isPlaying: false,
    isLooping: false,
    disabled: false,
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onStop: vi.fn(),
    onToggleLoop: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders play button when not playing', () => {
      render(<PlaybackControls {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    });

    it('renders pause button when playing', () => {
      render(<PlaybackControls {...defaultProps} isPlaying={true} />);
      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    });

    it('renders stop button', () => {
      render(<PlaybackControls {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    });

    it('renders loop button with correct aria-label when not looping', () => {
      render(<PlaybackControls {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Enable loop' })).toBeInTheDocument();
    });

    it('renders loop button with correct aria-label when looping', () => {
      render(<PlaybackControls {...defaultProps} isLooping={true} />);
      expect(screen.getByRole('button', { name: 'Disable loop' })).toBeInTheDocument();
    });
  });

  describe('play/pause toggle', () => {
    it('calls onPlay when clicking play button', () => {
      const onPlay = vi.fn();
      render(<PlaybackControls {...defaultProps} onPlay={onPlay} />);
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
      expect(onPlay).toHaveBeenCalledTimes(1);
    });

    it('calls onPause when clicking pause button', () => {
      const onPause = vi.fn();
      render(<PlaybackControls {...defaultProps} isPlaying={true} onPause={onPause} />);
      fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
      expect(onPause).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop button', () => {
    it('calls onStop when clicked', () => {
      const onStop = vi.fn();
      render(<PlaybackControls {...defaultProps} onStop={onStop} />);
      fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
      expect(onStop).toHaveBeenCalledTimes(1);
    });
  });

  describe('loop toggle', () => {
    it('calls onToggleLoop when clicked', () => {
      const onToggleLoop = vi.fn();
      render(<PlaybackControls {...defaultProps} onToggleLoop={onToggleLoop} />);
      fireEvent.click(screen.getByRole('button', { name: 'Enable loop' }));
      expect(onToggleLoop).toHaveBeenCalledTimes(1);
    });

    it('applies active styling when looping', () => {
      render(<PlaybackControls {...defaultProps} isLooping={true} />);
      const loopButton = screen.getByRole('button', { name: 'Disable loop' });
      expect(loopButton).toHaveClass('bg-primary');
    });
  });

  describe('disabled state', () => {
    it('disables all buttons when disabled prop is true', () => {
      render(<PlaybackControls {...defaultProps} disabled={true} />);

      expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Enable loop' })).toBeDisabled();
    });

    it('does not call callbacks when disabled', () => {
      const onPlay = vi.fn();
      render(<PlaybackControls {...defaultProps} disabled={true} onPlay={onPlay} />);
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
      expect(onPlay).not.toHaveBeenCalled();
    });
  });

  describe('visual states', () => {
    it('applies active styling to play/pause button when playing', () => {
      render(<PlaybackControls {...defaultProps} isPlaying={true} />);
      const pauseButton = screen.getByRole('button', { name: 'Pause' });
      expect(pauseButton).toHaveClass('bg-primary');
    });

    it('does not apply active styling to play button when not playing', () => {
      render(<PlaybackControls {...defaultProps} />);
      const playButton = screen.getByRole('button', { name: 'Play' });
      expect(playButton).not.toHaveClass('bg-primary');
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(PlaybackControls.displayName).toBe('PlaybackControls');
    });
  });

  describe('accessibility - touch target compliance', () => {
    it('play/pause button has h-11 (44px) touch target on mobile', () => {
      render(<PlaybackControls {...defaultProps} />);
      const playButton = screen.getByRole('button', { name: 'Play' });
      // h-11 ensures 44px touch target on mobile per WCAG accessibility guidelines
      expect(playButton).toHaveClass('h-11');
      expect(playButton).toHaveClass('w-11');
    });

    it('stop button has h-11 (44px) touch target on mobile', () => {
      render(<PlaybackControls {...defaultProps} />);
      const stopButton = screen.getByRole('button', { name: 'Stop' });
      // h-11 ensures 44px touch target on mobile per WCAG accessibility guidelines
      expect(stopButton).toHaveClass('h-11');
      expect(stopButton).toHaveClass('w-11');
    });

    it('loop button has h-11 (44px) touch target on mobile', () => {
      render(<PlaybackControls {...defaultProps} />);
      const loopButton = screen.getByRole('button', { name: 'Enable loop' });
      // h-11 ensures 44px touch target on mobile per WCAG accessibility guidelines
      expect(loopButton).toHaveClass('h-11');
      expect(loopButton).toHaveClass('w-11');
    });
  });
});
