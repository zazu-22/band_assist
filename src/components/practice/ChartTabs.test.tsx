import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChartTabs } from './ChartTabs';
import type { SongChart } from '@/types';

const createMockChart = (overrides: Partial<SongChart> = {}): SongChart => ({
  id: 'chart-1',
  name: 'Lead Sheet',
  instrument: 'Guitar',
  type: 'TEXT',
  content: 'Test content',
  ...overrides,
});

describe('ChartTabs', () => {
  const mockCharts: SongChart[] = [
    createMockChart({ id: 'chart-1', name: 'Guitar Tab', type: 'GP' }),
    createMockChart({ id: 'chart-2', name: 'Lead Sheet', type: 'PDF' }),
    createMockChart({ id: 'chart-3', name: 'Chord Chart', type: 'TEXT' }),
    createMockChart({ id: 'chart-4', name: 'Reference Image', type: 'IMAGE' }),
  ];

  const defaultProps = {
    charts: mockCharts,
    activeChartId: 'chart-1',
    onSelectChart: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders all chart tabs', () => {
      render(<ChartTabs {...defaultProps} />);
      expect(screen.getByText('Guitar Tab')).toBeInTheDocument();
      expect(screen.getByText('Lead Sheet')).toBeInTheDocument();
      expect(screen.getByText('Chord Chart')).toBeInTheDocument();
      expect(screen.getByText('Reference Image')).toBeInTheDocument();
    });

    it('renders with correct data-testid', () => {
      render(<ChartTabs {...defaultProps} />);
      expect(screen.getByTestId('chart-tabs')).toBeInTheDocument();
    });

    it('renders correct icon for each chart type', () => {
      render(<ChartTabs {...defaultProps} />);
      expect(screen.getByTestId('chart-icon-GP')).toBeInTheDocument();
      expect(screen.getByTestId('chart-icon-PDF')).toBeInTheDocument();
      expect(screen.getByTestId('chart-icon-TEXT')).toBeInTheDocument();
      expect(screen.getByTestId('chart-icon-IMAGE')).toBeInTheDocument();
    });

    it('renders null when charts array is empty', () => {
      const { container } = render(
        <ChartTabs {...defaultProps} charts={[]} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('active state', () => {
    it('applies active styling to selected chart', () => {
      render(<ChartTabs {...defaultProps} activeChartId="chart-1" />);
      const activeTab = screen.getByTestId('chart-tab-GP');
      expect(activeTab).toHaveAttribute('aria-selected', 'true');
      expect(activeTab).toHaveClass('bg-primary/20');
    });

    it('does not apply active styling to non-selected charts', () => {
      render(<ChartTabs {...defaultProps} activeChartId="chart-1" />);
      const inactiveTab = screen.getByTestId('chart-tab-PDF');
      expect(inactiveTab).toHaveAttribute('aria-selected', 'false');
      expect(inactiveTab).not.toHaveClass('bg-primary/20');
    });

    it('handles null activeChartId', () => {
      render(<ChartTabs {...defaultProps} activeChartId={null} />);
      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute('aria-selected', 'false');
      });
    });
  });

  describe('selection', () => {
    it('calls onSelectChart when tab is clicked', () => {
      const onSelectChart = vi.fn();
      render(<ChartTabs {...defaultProps} onSelectChart={onSelectChart} />);
      fireEvent.click(screen.getByText('Lead Sheet'));
      expect(onSelectChart).toHaveBeenCalledWith('chart-2');
    });

    it('calls onSelectChart with correct id for each tab', () => {
      const onSelectChart = vi.fn();
      render(<ChartTabs {...defaultProps} onSelectChart={onSelectChart} />);

      fireEvent.click(screen.getByText('Guitar Tab'));
      expect(onSelectChart).toHaveBeenCalledWith('chart-1');

      fireEvent.click(screen.getByText('Chord Chart'));
      expect(onSelectChart).toHaveBeenCalledWith('chart-3');
    });
  });

  describe('accessibility', () => {
    it('has tablist role on container', () => {
      render(<ChartTabs {...defaultProps} />);
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('has tab role on each button', () => {
      render(<ChartTabs {...defaultProps} />);
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4);
    });

    it('has aria-label on tablist', () => {
      render(<ChartTabs {...defaultProps} />);
      expect(screen.getByRole('tablist')).toHaveAttribute(
        'aria-label',
        'Chart type selector'
      );
    });

    it('sets aria-selected correctly for active tab', () => {
      render(<ChartTabs {...defaultProps} activeChartId="chart-2" />);
      const activeTab = screen.getByTestId('chart-tab-PDF');
      expect(activeTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('chart type icons', () => {
    it('renders GP chart with Guitar icon', () => {
      render(
        <ChartTabs
          {...defaultProps}
          charts={[createMockChart({ id: 'gp', name: 'GP Chart', type: 'GP' })]}
        />
      );
      expect(screen.getByTestId('chart-tab-GP')).toBeInTheDocument();
    });

    it('renders PDF chart with FileText icon', () => {
      render(
        <ChartTabs
          {...defaultProps}
          charts={[createMockChart({ id: 'pdf', name: 'PDF Chart', type: 'PDF' })]}
        />
      );
      expect(screen.getByTestId('chart-tab-PDF')).toBeInTheDocument();
    });

    it('renders IMAGE chart with File icon', () => {
      render(
        <ChartTabs
          {...defaultProps}
          charts={[createMockChart({ id: 'img', name: 'Image Chart', type: 'IMAGE' })]}
        />
      );
      expect(screen.getByTestId('chart-tab-IMAGE')).toBeInTheDocument();
    });

    it('renders TEXT chart with Music2 icon', () => {
      render(
        <ChartTabs
          {...defaultProps}
          charts={[createMockChart({ id: 'txt', name: 'Text Chart', type: 'TEXT' })]}
        />
      );
      expect(screen.getByTestId('chart-tab-TEXT')).toBeInTheDocument();
    });
  });

  describe('single chart', () => {
    it('renders single chart correctly', () => {
      render(
        <ChartTabs
          {...defaultProps}
          charts={[createMockChart()]}
          activeChartId="chart-1"
        />
      );
      expect(screen.getByText('Lead Sheet')).toBeInTheDocument();
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(ChartTabs.displayName).toBe('ChartTabs');
    });
  });
});
