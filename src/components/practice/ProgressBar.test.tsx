import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  const defaultProps = {
    currentTime: 60000, // 1 minute
    totalTime: 180000, // 3 minutes
    onSeek: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders progress bar container', () => {
      render(<ProgressBar {...defaultProps} />);
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('renders current time', () => {
      render(<ProgressBar {...defaultProps} />);
      expect(screen.getByText('1:00')).toBeInTheDocument();
    });

    it('renders total time', () => {
      render(<ProgressBar {...defaultProps} />);
      expect(screen.getByText('3:00')).toBeInTheDocument();
    });

    it('renders slider element', () => {
      render(<ProgressBar {...defaultProps} />);
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });
  });

  describe('time formatting', () => {
    it('formats seconds correctly', () => {
      render(<ProgressBar {...defaultProps} currentTime={30000} />);
      expect(screen.getByText('0:30')).toBeInTheDocument();
    });

    it('pads single digit seconds', () => {
      render(<ProgressBar {...defaultProps} currentTime={5000} />);
      expect(screen.getByText('0:05')).toBeInTheDocument();
    });

    it('handles zero time', () => {
      render(<ProgressBar {...defaultProps} currentTime={0} totalTime={60000} />);
      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('formats minutes correctly', () => {
      render(<ProgressBar {...defaultProps} currentTime={125000} />);
      expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    it('handles long durations', () => {
      render(<ProgressBar {...defaultProps} currentTime={600000} totalTime={3600000} />);
      expect(screen.getByText('10:00')).toBeInTheDocument();
      expect(screen.getByText('60:00')).toBeInTheDocument();
    });
  });

  describe('progress percentage', () => {
    it('calculates progress correctly', () => {
      render(<ProgressBar {...defaultProps} currentTime={90000} totalTime={180000} />);
      // 50% progress - check via style or visual assertion
      const progressFill = screen.getByTestId('progress-bar').querySelector('.bg-primary');
      expect(progressFill).toHaveStyle({ width: '50%' });
    });

    it('handles zero total time', () => {
      render(<ProgressBar {...defaultProps} currentTime={0} totalTime={0} />);
      const progressFill = screen.getByTestId('progress-bar').querySelector('.bg-primary');
      expect(progressFill).toHaveStyle({ width: '0%' });
    });

    it('shows 100% at end', () => {
      render(<ProgressBar {...defaultProps} currentTime={180000} totalTime={180000} />);
      const progressFill = screen.getByTestId('progress-bar').querySelector('.bg-primary');
      expect(progressFill).toHaveStyle({ width: '100%' });
    });
  });

  describe('click to seek', () => {
    it('calls onSeek when progress bar is clicked', () => {
      const onSeek = vi.fn();
      render(<ProgressBar {...defaultProps} onSeek={onSeek} />);

      const slider = screen.getByRole('slider');

      // Mock getBoundingClientRect
      const mockRect = {
        left: 0,
        width: 100,
        top: 0,
        right: 100,
        bottom: 10,
        height: 10,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };
      vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue(mockRect);

      fireEvent.click(slider, { clientX: 50 });

      expect(onSeek).toHaveBeenCalledWith(0.5);
    });

    it('clamps seek to 0-1 range', () => {
      const onSeek = vi.fn();
      render(<ProgressBar {...defaultProps} onSeek={onSeek} />);

      const slider = screen.getByRole('slider');
      const mockRect = {
        left: 0,
        width: 100,
        top: 0,
        right: 100,
        bottom: 10,
        height: 10,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };
      vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue(mockRect);

      // Click beyond bounds
      fireEvent.click(slider, { clientX: 150 });
      expect(onSeek).toHaveBeenCalledWith(1);

      fireEvent.click(slider, { clientX: -50 });
      expect(onSeek).toHaveBeenCalledWith(0);
    });
  });

  describe('keyboard navigation', () => {
    it('seeks backward on ArrowLeft', () => {
      const onSeek = vi.fn();
      render(
        <ProgressBar {...defaultProps} onSeek={onSeek} currentTime={90000} totalTime={180000} />
      );

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowLeft' });

      // Current is 50%, should seek to 45%
      expect(onSeek).toHaveBeenCalledWith(0.45);
    });

    it('seeks forward on ArrowRight', () => {
      const onSeek = vi.fn();
      render(
        <ProgressBar {...defaultProps} onSeek={onSeek} currentTime={90000} totalTime={180000} />
      );

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowRight' });

      // Current is 50%, should seek to 55%
      expect(onSeek).toHaveBeenCalledWith(0.55);
    });

    it('jumps to start on Home', () => {
      const onSeek = vi.fn();
      render(<ProgressBar {...defaultProps} onSeek={onSeek} />);

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'Home' });

      expect(onSeek).toHaveBeenCalledWith(0);
    });

    it('jumps to end on End', () => {
      const onSeek = vi.fn();
      render(<ProgressBar {...defaultProps} onSeek={onSeek} />);

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'End' });

      expect(onSeek).toHaveBeenCalledWith(1);
    });

    it('prevents default on arrow keys', () => {
      render(<ProgressBar {...defaultProps} />);
      const slider = screen.getByRole('slider');

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      slider.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('prevents default on Home key', () => {
      render(<ProgressBar {...defaultProps} />);
      const slider = screen.getByRole('slider');

      const event = new KeyboardEvent('keydown', {
        key: 'Home',
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      slider.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('prevents default on End key', () => {
      render(<ProgressBar {...defaultProps} />);
      const slider = screen.getByRole('slider');

      const event = new KeyboardEvent('keydown', {
        key: 'End',
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      slider.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('clamps ArrowLeft seek to 0', () => {
      const onSeek = vi.fn();
      render(
        <ProgressBar {...defaultProps} onSeek={onSeek} currentTime={1000} totalTime={180000} />
      );

      const slider = screen.getByRole('slider');
      // Multiple arrow lefts from near start
      fireEvent.keyDown(slider, { key: 'ArrowLeft' });

      // Should clamp to 0, not go negative
      expect(onSeek).toHaveBeenCalled();
      const calledValue = onSeek.mock.calls[0][0];
      expect(calledValue).toBeGreaterThanOrEqual(0);
    });

    it('clamps ArrowRight seek to 1', () => {
      const onSeek = vi.fn();
      render(
        <ProgressBar {...defaultProps} onSeek={onSeek} currentTime={175000} totalTime={180000} />
      );

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowRight' });

      expect(onSeek).toHaveBeenCalled();
      const calledValue = onSeek.mock.calls[0][0];
      expect(calledValue).toBeLessThanOrEqual(1);
    });

    it('ignores other keys', () => {
      const onSeek = vi.fn();
      render(<ProgressBar {...defaultProps} onSeek={onSeek} />);

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'a' });
      fireEvent.keyDown(slider, { key: 'Enter' });
      fireEvent.keyDown(slider, { key: ' ' });

      expect(onSeek).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has correct aria-valuenow', () => {
      render(<ProgressBar {...defaultProps} currentTime={60000} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '60000');
    });

    it('has correct aria-valuemin', () => {
      render(<ProgressBar {...defaultProps} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuemin', '0');
    });

    it('has correct aria-valuemax', () => {
      render(<ProgressBar {...defaultProps} totalTime={180000} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuemax', '180000');
    });

    it('has aria-label', () => {
      render(<ProgressBar {...defaultProps} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-label', 'Playback position');
    });

    it('is focusable', () => {
      render(<ProgressBar {...defaultProps} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('tabIndex', '0');
    });

    it('has focus-visible styling classes', () => {
      render(<ProgressBar {...defaultProps} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveClass('focus-visible:ring-2');
      expect(slider).toHaveClass('focus-visible:ring-primary');
    });
  });

  describe('visual elements', () => {
    it('renders progress fill div', () => {
      render(<ProgressBar {...defaultProps} />);
      const progressFill = screen.getByTestId('progress-bar').querySelector('.bg-primary');
      expect(progressFill).toBeInTheDocument();
    });

    it('renders scrubber handle', () => {
      render(<ProgressBar {...defaultProps} />);
      const scrubber = screen.getByTestId('progress-bar').querySelector('.pointer-events-none');
      expect(scrubber).toBeInTheDocument();
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(ProgressBar.displayName).toBe('ProgressBar');
    });
  });
});
