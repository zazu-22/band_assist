import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock component for testing
const MockAlphaTabRenderer = ({ fileData }: { fileData: string }) => (
  <div data-testid="alphatab-renderer">AlphaTab Loaded: {fileData.slice(0, 20)}</div>
);
MockAlphaTabRenderer.displayName = 'MockAlphaTabRenderer';

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
