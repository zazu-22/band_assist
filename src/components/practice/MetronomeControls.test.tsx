import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetronomeControls } from './MetronomeControls';
import type { MetronomeState } from './types';

describe('MetronomeControls', () => {
  const mockMetronomeState: MetronomeState = {
    isActive: false,
    bpm: 120,
  };

  const mockOnBpmChange = vi.fn();
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders toggle button with correct aria-label when inactive', () => {
      render(
        <MetronomeControls
          metronomeState={mockMetronomeState}
          onBpmChange={mockOnBpmChange}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByRole('button', { name: 'Start metronome' })).toBeInTheDocument();
    });

    it('renders toggle button with correct aria-label when active', () => {
      render(
        <MetronomeControls
          metronomeState={{ ...mockMetronomeState, isActive: true }}
          onBpmChange={mockOnBpmChange}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByRole('button', { name: 'Stop metronome' })).toBeInTheDocument();
    });

    it('renders BPM slider with correct value', () => {
      render(
        <MetronomeControls
          metronomeState={mockMetronomeState}
          onBpmChange={mockOnBpmChange}
          onToggle={mockOnToggle}
        />
      );

      const slider = screen.getByRole('slider', { name: 'Metronome BPM' });
      expect(slider).toHaveValue('120');
    });

    it('renders BPM display showing current value', () => {
      render(
        <MetronomeControls
          metronomeState={{ ...mockMetronomeState, bpm: 180 }}
          onBpmChange={mockOnBpmChange}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByText('180')).toBeInTheDocument();
    });

    it('displays slider with min 40 and max 220', () => {
      render(
        <MetronomeControls
          metronomeState={mockMetronomeState}
          onBpmChange={mockOnBpmChange}
          onToggle={mockOnToggle}
        />
      );

      const slider = screen.getByRole('slider', { name: 'Metronome BPM' });
      expect(slider).toHaveAttribute('min', '40');
      expect(slider).toHaveAttribute('max', '220');
    });
  });

  describe('interactions', () => {
    it('calls onToggle when toggle button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <MetronomeControls
          metronomeState={mockMetronomeState}
          onBpmChange={mockOnBpmChange}
          onToggle={mockOnToggle}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Start metronome' }));
      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it('calls onBpmChange when slider value changes', () => {
      render(
        <MetronomeControls
          metronomeState={mockMetronomeState}
          onBpmChange={mockOnBpmChange}
          onToggle={mockOnToggle}
        />
      );

      const slider = screen.getByRole('slider', { name: 'Metronome BPM' });
      fireEvent.change(slider, { target: { value: '150' } });
      expect(mockOnBpmChange).toHaveBeenCalledWith(150);
    });
  });

  describe('variants', () => {
    it('applies compact styling by default', () => {
      render(
        <MetronomeControls
          metronomeState={mockMetronomeState}
          onBpmChange={mockOnBpmChange}
          onToggle={mockOnToggle}
        />
      );

      const slider = screen.getByRole('slider', { name: 'Metronome BPM' });
      expect(slider.className).toContain('w-20');
    });

    it('applies compact styling when variant is "compact"', () => {
      render(
        <MetronomeControls
          metronomeState={mockMetronomeState}
          onBpmChange={mockOnBpmChange}
          onToggle={mockOnToggle}
          variant="compact"
        />
      );

      const slider = screen.getByRole('slider', { name: 'Metronome BPM' });
      expect(slider.className).toContain('w-20');
    });

    it('applies expanded styling when variant is "expanded"', () => {
      render(
        <MetronomeControls
          metronomeState={mockMetronomeState}
          onBpmChange={mockOnBpmChange}
          onToggle={mockOnToggle}
          variant="expanded"
        />
      );

      const slider = screen.getByRole('slider', { name: 'Metronome BPM' });
      expect(slider.className).toContain('w-24');
    });
  });

  describe('visual states', () => {
    it('applies active styling to toggle button when metronome is active', () => {
      render(
        <MetronomeControls
          metronomeState={{ ...mockMetronomeState, isActive: true }}
          onBpmChange={mockOnBpmChange}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button', { name: 'Stop metronome' });
      expect(button.className).toContain('bg-primary');
      expect(button.className).toContain('text-primary-foreground');
    });

    it('applies inactive styling to toggle button when metronome is inactive', () => {
      render(
        <MetronomeControls
          metronomeState={mockMetronomeState}
          onBpmChange={mockOnBpmChange}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button', { name: 'Start metronome' });
      expect(button.className).toContain('text-muted-foreground');
    });
  });

  describe('accessibility', () => {
    it('has touch target size compliance for toggle button (h-11 = 44px mobile)', () => {
      render(
        <MetronomeControls
          metronomeState={mockMetronomeState}
          onBpmChange={mockOnBpmChange}
          onToggle={mockOnToggle}
        />
      );

      const button = screen.getByRole('button', { name: 'Start metronome' });
      // h-11 ensures 44px touch target on mobile
      expect(button.className).toContain('h-11');
      expect(button.className).toContain('w-11');
    });

    it('renders slider with proper aria-label for screen readers', () => {
      render(
        <MetronomeControls
          metronomeState={mockMetronomeState}
          onBpmChange={mockOnBpmChange}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByRole('slider', { name: 'Metronome BPM' })).toBeInTheDocument();
    });
  });
});
