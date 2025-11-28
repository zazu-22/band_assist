import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetronomeIndicator } from './MetronomeIndicator';

describe('MetronomeIndicator', () => {
  describe('rendering', () => {
    it('renders four beat indicators', () => {
      render(<MetronomeIndicator currentBeat={0} />);
      expect(screen.getByTestId('beat-1')).toBeInTheDocument();
      expect(screen.getByTestId('beat-2')).toBeInTheDocument();
      expect(screen.getByTestId('beat-3')).toBeInTheDocument();
      expect(screen.getByTestId('beat-4')).toBeInTheDocument();
    });

    it('renders container with correct test id', () => {
      render(<MetronomeIndicator currentBeat={0} />);
      expect(screen.getByTestId('metronome-indicator')).toBeInTheDocument();
    });
  });

  describe('beat highlighting', () => {
    it('highlights beat 1 when currentBeat is 1', () => {
      render(<MetronomeIndicator currentBeat={1} />);
      const beat1 = screen.getByTestId('beat-1');
      expect(beat1).toHaveClass('bg-primary');
      expect(beat1).toHaveClass('scale-150');
    });

    it('highlights beat 2 when currentBeat is 2', () => {
      render(<MetronomeIndicator currentBeat={2} />);
      const beat2 = screen.getByTestId('beat-2');
      expect(beat2).toHaveClass('bg-primary');
      expect(beat2).toHaveClass('scale-150');
    });

    it('highlights beat 3 when currentBeat is 3', () => {
      render(<MetronomeIndicator currentBeat={3} />);
      const beat3 = screen.getByTestId('beat-3');
      expect(beat3).toHaveClass('bg-primary');
      expect(beat3).toHaveClass('scale-150');
    });

    it('highlights beat 4 when currentBeat is 4', () => {
      render(<MetronomeIndicator currentBeat={4} />);
      const beat4 = screen.getByTestId('beat-4');
      expect(beat4).toHaveClass('bg-primary');
      expect(beat4).toHaveClass('scale-150');
    });

    it('does not highlight any beats when currentBeat is 0', () => {
      render(<MetronomeIndicator currentBeat={0} />);
      const beats = [
        screen.getByTestId('beat-1'),
        screen.getByTestId('beat-2'),
        screen.getByTestId('beat-3'),
        screen.getByTestId('beat-4'),
      ];
      beats.forEach((beat) => {
        expect(beat).not.toHaveClass('bg-primary');
        expect(beat).not.toHaveClass('scale-150');
      });
    });

    it('shows inactive styling for non-current beats', () => {
      render(<MetronomeIndicator currentBeat={1} />);
      const beat2 = screen.getByTestId('beat-2');
      expect(beat2).toHaveClass('bg-muted-foreground/30');
    });
  });

  describe('accessibility', () => {
    it('has correct aria-label when inactive', () => {
      render(<MetronomeIndicator currentBeat={0} />);
      expect(screen.getByLabelText('Metronome beat inactive')).toBeInTheDocument();
    });

    it('has correct aria-label when beat 1 is active', () => {
      render(<MetronomeIndicator currentBeat={1} />);
      expect(screen.getByLabelText('Metronome beat 1')).toBeInTheDocument();
    });

    it('has correct aria-label when beat 3 is active', () => {
      render(<MetronomeIndicator currentBeat={3} />);
      expect(screen.getByLabelText('Metronome beat 3')).toBeInTheDocument();
    });

    it('marks beat indicators as aria-hidden', () => {
      render(<MetronomeIndicator currentBeat={1} />);
      const beat1 = screen.getByTestId('beat-1');
      expect(beat1).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('styling', () => {
    it('applies transition classes', () => {
      render(<MetronomeIndicator currentBeat={1} />);
      const beat1 = screen.getByTestId('beat-1');
      expect(beat1).toHaveClass('transition-all');
    });

    it('applies motion-reduce classes', () => {
      render(<MetronomeIndicator currentBeat={1} />);
      const beat1 = screen.getByTestId('beat-1');
      expect(beat1).toHaveClass('motion-reduce:transition-none');
    });

    it('applies rounded styling', () => {
      render(<MetronomeIndicator currentBeat={0} />);
      const beat1 = screen.getByTestId('beat-1');
      expect(beat1).toHaveClass('rounded-full');
    });
  });

  describe('beat transitions', () => {
    it('only one beat is highlighted at a time', () => {
      const { rerender } = render(<MetronomeIndicator currentBeat={1} />);

      // Beat 1 should be highlighted
      expect(screen.getByTestId('beat-1')).toHaveClass('bg-primary');
      expect(screen.getByTestId('beat-2')).not.toHaveClass('bg-primary');

      // Transition to beat 2
      rerender(<MetronomeIndicator currentBeat={2} />);
      expect(screen.getByTestId('beat-1')).not.toHaveClass('bg-primary');
      expect(screen.getByTestId('beat-2')).toHaveClass('bg-primary');

      // Transition to beat 3
      rerender(<MetronomeIndicator currentBeat={3} />);
      expect(screen.getByTestId('beat-2')).not.toHaveClass('bg-primary');
      expect(screen.getByTestId('beat-3')).toHaveClass('bg-primary');
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(MetronomeIndicator.displayName).toBe('MetronomeIndicator');
    });
  });
});
