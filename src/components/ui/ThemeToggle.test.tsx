import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';
import { ThemeProvider } from './ThemeProvider';

// Helper to render ThemeToggle with ThemeProvider
function renderWithProvider(props: Parameters<typeof ThemeToggle>[0] = {}) {
  return render(
    <ThemeProvider defaultTheme="dark">
      <ThemeToggle {...props} />
    </ThemeProvider>
  );
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
    // Mock matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  describe('rendering', () => {
    it('renders toggle button', () => {
      renderWithProvider();
      expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
    });

    it('shows moon icon in dark mode', () => {
      renderWithProvider();
      // Moon icon should be present (SVG)
      const button = screen.getByRole('button', { name: /toggle theme/i });
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('displays theme label when not collapsed', () => {
      renderWithProvider({ collapsed: false });
      expect(screen.getByText('Dark')).toBeInTheDocument();
    });

    it('hides theme label when collapsed', () => {
      renderWithProvider({ collapsed: true });
      expect(screen.queryByText('Dark')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      renderWithProvider({ className: 'custom-class' });
      const button = screen.getByRole('button', { name: /toggle theme/i });
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('dropdown menu', () => {
    it('opens dropdown on click', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByRole('button', { name: /toggle theme/i }));

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /light/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /dark/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /system/i })).toBeInTheDocument();
      });
    });

    it('switches to light theme when Light is clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByRole('button', { name: /toggle theme/i }));

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /light/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /light/i }));

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });
    });

    it('switches to dark theme when Dark is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider defaultTheme="light">
          <ThemeToggle />
        </ThemeProvider>
      );

      await user.click(screen.getByRole('button', { name: /toggle theme/i }));

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /dark/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /dark/i }));

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    it('switches to system theme when System is clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByRole('button', { name: /toggle theme/i }));

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /system/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /system/i }));

      await waitFor(() => {
        expect(localStorage.getItem('band-assist-theme')).toBe('system');
      });
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(ThemeToggle.displayName).toBe('ThemeToggle');
    });
  });
});
