import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TempoControl } from './TempoControl';

describe('TempoControl', () => {
  const defaultProps = {
    currentBPM: 120,
    originalTempo: 120,
    currentSpeed: 1.0,
    onSetBPM: vi.fn(),
    onReset: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('displays current BPM', () => {
      render(<TempoControl {...defaultProps} />);
      // BPM shows in both the main display and the slider range
      const bpmTexts = screen.getAllByText('120');
      expect(bpmTexts.length).toBeGreaterThanOrEqual(1);
    });

    it('displays BPM label', () => {
      render(<TempoControl {...defaultProps} />);
      expect(screen.getByText('BPM')).toBeInTheDocument();
    });

    it('renders slider with correct value', () => {
      render(<TempoControl {...defaultProps} />);
      const slider = screen.getByTestId('bpm-slider');
      expect(slider).toHaveValue('120');
    });

    it('renders slider with min/max based on original tempo', () => {
      render(<TempoControl {...defaultProps} originalTempo={100} />);
      const slider = screen.getByTestId('bpm-slider');
      // Min = 100 * 0.25 = 25, Max = 100 * 2.0 = 200
      expect(slider).toHaveAttribute('min', '25');
      expect(slider).toHaveAttribute('max', '200');
    });
  });

  describe('inline editing', () => {
    it('shows input when BPM display is clicked', () => {
      render(<TempoControl {...defaultProps} />);
      const bpmButton = screen.getByLabelText('Click to edit BPM');
      fireEvent.click(bpmButton);
      expect(screen.getByTestId('bpm-input')).toBeInTheDocument();
    });

    it('populates input with current BPM value', () => {
      render(<TempoControl {...defaultProps} currentBPM={140} />);
      fireEvent.click(screen.getByLabelText('Click to edit BPM'));
      const input = screen.getByTestId('bpm-input') as HTMLInputElement;
      expect(input.value).toBe('140');
    });

    it('calls onSetBPM on Enter key', () => {
      const onSetBPM = vi.fn();
      render(<TempoControl {...defaultProps} onSetBPM={onSetBPM} />);

      fireEvent.click(screen.getByLabelText('Click to edit BPM'));
      const input = screen.getByTestId('bpm-input');

      fireEvent.change(input, { target: { value: '150' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSetBPM).toHaveBeenCalledWith(150);
    });

    it('closes input on Escape key without saving', () => {
      const onSetBPM = vi.fn();
      render(<TempoControl {...defaultProps} onSetBPM={onSetBPM} />);

      fireEvent.click(screen.getByLabelText('Click to edit BPM'));
      const input = screen.getByTestId('bpm-input');

      fireEvent.change(input, { target: { value: '150' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(onSetBPM).not.toHaveBeenCalled();
      expect(screen.queryByTestId('bpm-input')).not.toBeInTheDocument();
    });

    it('calls onSetBPM on blur', () => {
      const onSetBPM = vi.fn();
      render(<TempoControl {...defaultProps} onSetBPM={onSetBPM} />);

      fireEvent.click(screen.getByLabelText('Click to edit BPM'));
      const input = screen.getByTestId('bpm-input');

      fireEvent.change(input, { target: { value: '130' } });
      fireEvent.blur(input);

      expect(onSetBPM).toHaveBeenCalledWith(130);
    });

    it('clamps BPM to minimum value', () => {
      const onSetBPM = vi.fn();
      render(<TempoControl {...defaultProps} originalTempo={100} onSetBPM={onSetBPM} />);

      fireEvent.click(screen.getByLabelText('Click to edit BPM'));
      const input = screen.getByTestId('bpm-input');

      // Min = 100 * 0.25 = 25
      fireEvent.change(input, { target: { value: '10' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSetBPM).toHaveBeenCalledWith(25);
    });

    it('clamps BPM to maximum value', () => {
      const onSetBPM = vi.fn();
      render(<TempoControl {...defaultProps} originalTempo={100} onSetBPM={onSetBPM} />);

      fireEvent.click(screen.getByLabelText('Click to edit BPM'));
      const input = screen.getByTestId('bpm-input');

      // Max = 100 * 2.0 = 200
      fireEvent.change(input, { target: { value: '300' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSetBPM).toHaveBeenCalledWith(200);
    });

    it('handles invalid input gracefully', () => {
      const onSetBPM = vi.fn();
      render(<TempoControl {...defaultProps} onSetBPM={onSetBPM} />);

      fireEvent.click(screen.getByLabelText('Click to edit BPM'));
      const input = screen.getByTestId('bpm-input');

      fireEvent.change(input, { target: { value: 'abc' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // Should not call onSetBPM with NaN
      expect(onSetBPM).not.toHaveBeenCalled();
    });
  });

  describe('slider interaction', () => {
    it('calls onSetBPM when slider is changed', () => {
      const onSetBPM = vi.fn();
      render(<TempoControl {...defaultProps} onSetBPM={onSetBPM} />);

      const slider = screen.getByTestId('bpm-slider');
      fireEvent.change(slider, { target: { value: '100' } });

      expect(onSetBPM).toHaveBeenCalledWith(100);
    });

    it('has correct aria-label', () => {
      render(<TempoControl {...defaultProps} />);
      const slider = screen.getByLabelText('Tempo slider');
      expect(slider).toBeInTheDocument();
    });
  });

  describe('reset button', () => {
    it('shows reset button when speed is modified', () => {
      render(<TempoControl {...defaultProps} currentSpeed={0.75} />);
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    it('hides reset button when speed is 1.0', () => {
      render(<TempoControl {...defaultProps} currentSpeed={1.0} />);
      expect(screen.queryByText('Reset')).not.toBeInTheDocument();
    });

    it('calls onReset when reset button is clicked', () => {
      const onReset = vi.fn();
      render(<TempoControl {...defaultProps} currentSpeed={0.5} onReset={onReset} />);

      fireEvent.click(screen.getByText('Reset'));
      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('tempo range display', () => {
    it('displays min BPM', () => {
      render(<TempoControl {...defaultProps} originalTempo={100} />);
      // Min = 100 * 0.25 = 25
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('displays max BPM', () => {
      render(<TempoControl {...defaultProps} originalTempo={100} />);
      // Max = 100 * 2.0 = 200
      expect(screen.getByText('200')).toBeInTheDocument();
    });

    it('displays current BPM in range display', () => {
      render(<TempoControl {...defaultProps} currentBPM={150} originalTempo={100} />);
      // Should show 150 as both the main display and in the range area
      const bpmDisplays = screen.getAllByText('150');
      expect(bpmDisplays.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('different tempo values', () => {
    it('handles slow tempo (60 BPM)', () => {
      render(<TempoControl {...defaultProps} originalTempo={60} currentBPM={60} />);
      // Check slider has correct range
      const slider = screen.getByTestId('bpm-slider');
      expect(slider).toHaveAttribute('min', '15'); // 60 * 0.25
      expect(slider).toHaveAttribute('max', '120'); // 60 * 2.0
      expect(slider).toHaveValue('60');
    });

    it('handles fast tempo (200 BPM)', () => {
      render(<TempoControl {...defaultProps} originalTempo={200} currentBPM={200} />);
      // Check slider has correct range
      const slider = screen.getByTestId('bpm-slider');
      expect(slider).toHaveAttribute('min', '50'); // 200 * 0.25
      expect(slider).toHaveAttribute('max', '400'); // 200 * 2.0
      expect(slider).toHaveValue('200');
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(TempoControl.displayName).toBe('TempoControl');
    });
  });
});
