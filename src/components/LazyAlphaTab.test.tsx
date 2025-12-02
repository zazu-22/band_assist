import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Track props passed to mock component using vi.fn()
const mockRenderFn = vi.fn();

// Mock component for testing - captures all props for verification
function MockAlphaTabRendererImpl(props: Record<string, unknown>) {
  mockRenderFn(props);
  return (
    <div data-testid="alphatab-renderer">
      AlphaTab Loaded: {String(props.fileData).slice(0, 20)}
      {props.readOnly !== undefined && (
        <span data-testid="readonly-value">{String(props.readOnly)}</span>
      )}
      {props.showControls !== undefined && (
        <span data-testid="showcontrols-value">{String(props.showControls)}</span>
      )}
    </div>
  );
}
MockAlphaTabRendererImpl.displayName = 'MockAlphaTabRenderer';
const MockAlphaTabRenderer = MockAlphaTabRendererImpl;

// Mock the AlphaTabRenderer module
vi.mock('./AlphaTabRenderer', () => ({
  AlphaTabRenderer: MockAlphaTabRenderer,
  __esModule: true,
}));

// Import after mock is set up
import { LazyAlphaTab } from './LazyAlphaTab';

describe('LazyAlphaTab', () => {
  const mockFileData = 'data:application/octet-stream;base64,VEVTVERBVEE=';

  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderFn.mockClear();
  });

  describe('Loading State', () => {
    it('should show loading spinner while AlphaTab loads', async () => {
      render(<LazyAlphaTab fileData={mockFileData} />);

      // The loading message should appear initially (Suspense fallback)
      expect(screen.getByText('Loading guitar tab renderer...')).toBeInTheDocument();
    });

    it('should render loading spinner with correct accessibility', async () => {
      render(<LazyAlphaTab fileData={mockFileData} />);

      // Check for the spinner with proper role
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should have loading fallback with proper mobile styling', () => {
      render(<LazyAlphaTab fileData={mockFileData} />);

      // Check the loading text is present and styled
      const loadingText = screen.getByText('Loading guitar tab renderer...');
      expect(loadingText).toHaveClass('text-sm', 'font-medium');
    });
  });

  describe('Loaded State', () => {
    it('should render AlphaTabRenderer after Suspense resolves', async () => {
      render(<LazyAlphaTab fileData={mockFileData} />);

      // Wait for lazy component to load
      await waitFor(() => {
        expect(screen.getByTestId('alphatab-renderer')).toBeInTheDocument();
      });

      // Loading message should be gone
      expect(screen.queryByText('Loading guitar tab renderer...')).not.toBeInTheDocument();
    });

    it('should pass all props through to AlphaTabRenderer', async () => {
      render(<LazyAlphaTab fileData={mockFileData} readOnly={true} />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('alphatab-renderer')).toBeInTheDocument();
      });

      // Verify fileData was passed (our mock displays part of it)
      expect(screen.getByText(/AlphaTab Loaded: data:application/)).toBeInTheDocument();
    });

    it('should pass readOnly prop correctly', async () => {
      render(<LazyAlphaTab fileData={mockFileData} readOnly={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('alphatab-renderer')).toBeInTheDocument();
      });

      const lastProps = mockRenderFn.mock.calls[mockRenderFn.mock.calls.length - 1][0];
      expect(lastProps.readOnly).toBe(true);
    });

    it('should pass showControls prop correctly', async () => {
      render(<LazyAlphaTab fileData={mockFileData} showControls={false} />);

      await waitFor(() => {
        expect(screen.getByTestId('alphatab-renderer')).toBeInTheDocument();
      });

      const lastProps = mockRenderFn.mock.calls[mockRenderFn.mock.calls.length - 1][0];
      expect(lastProps.showControls).toBe(false);
    });

    it('should pass callback props correctly', async () => {
      const mockOnReady = vi.fn();
      const mockOnError = vi.fn();

      render(
        <LazyAlphaTab fileData={mockFileData} onReady={mockOnReady} onError={mockOnError} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('alphatab-renderer')).toBeInTheDocument();
      });

      const lastProps = mockRenderFn.mock.calls[mockRenderFn.mock.calls.length - 1][0];
      expect(lastProps.onReady).toBe(mockOnReady);
      expect(lastProps.onError).toBe(mockOnError);
    });
  });

  describe('Type Exports', () => {
    it('should export AlphaTabHandle type', async () => {
      // This is a compile-time check - if types aren't exported, this file won't compile
      // We can verify by importing the types
      const module = await import('./LazyAlphaTab');
      expect(module.LazyAlphaTab).toBeDefined();
      // Type exports don't have runtime presence, but the module should load without error
    });
  });

  describe('DisplayName', () => {
    it('should have displayName set for React DevTools', () => {
      expect(LazyAlphaTab.displayName).toBe('LazyAlphaTab');
    });
  });
});
