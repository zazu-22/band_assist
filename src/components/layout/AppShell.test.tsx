import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './AppShell';
import { SidebarProvider } from './SidebarProvider';
import { ThemeProvider } from '@/components/ui/ThemeProvider';

// Mock useIsDesktop hook to control desktop/mobile rendering
vi.mock('@/hooks/useMediaQuery', () => ({
  useIsDesktop: vi.fn(() => true),
  useIsMobile: vi.fn(() => false),
  useMediaQuery: vi.fn(() => true),
}));

import { useIsDesktop } from '@/hooks/useMediaQuery';

// Test content component
function TestContent() {
  return <div data-testid="test-content">Test Content</div>;
}

// Helper to render AppShell with all required providers
function renderAppShell(props: Parameters<typeof AppShell>[0] = {}, isDesktop = true) {
  vi.mocked(useIsDesktop).mockReturnValue(isDesktop);

  return render(
    <MemoryRouter>
      <ThemeProvider defaultTheme="dark">
        <SidebarProvider>
          <Routes>
            <Route element={<AppShell {...props} />}>
              <Route index element={<TestContent />} />
            </Route>
          </Routes>
        </SidebarProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
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
    it('renders main content outlet', () => {
      renderAppShell();
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('renders sidebar on desktop', () => {
      renderAppShell({}, true);
      expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
    });

    it('renders mobile nav on mobile', () => {
      renderAppShell({}, false);
      expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument();
    });
  });

  describe('skip link', () => {
    it('renders skip link for accessibility', () => {
      renderAppShell();
      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    it('skip link points to main content', () => {
      renderAppShell();
      const mainContent = document.getElementById('main-content');
      expect(mainContent).toBeInTheDocument();
      expect(mainContent?.tagName).toBe('MAIN');
    });

    it('skip link is visually hidden but focusable', () => {
      renderAppShell();
      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toHaveClass('sr-only');
    });

    it('skip link becomes visible on focus', async () => {
      const user = userEvent.setup();
      renderAppShell();

      const skipLink = screen.getByText('Skip to main content');

      // Tab to focus the skip link
      await user.tab();

      // Skip link should have focus-related classes
      expect(skipLink).toHaveClass('focus:not-sr-only');
    });
  });

  describe('main content', () => {
    it('main content has id for skip link target', () => {
      renderAppShell();
      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('id', 'main-content');
    });

    it('main content has tabIndex for programmatic focus', () => {
      renderAppShell();
      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('tabindex', '-1');
    });

    it('adds padding on mobile for header', () => {
      renderAppShell({}, false);
      const main = screen.getByRole('main');
      expect(main).toHaveClass('pt-16');
    });

    it('does not add extra padding on desktop', () => {
      renderAppShell({}, true);
      const main = screen.getByRole('main');
      expect(main).not.toHaveClass('pt-16');
    });
  });

  describe('props passing', () => {
    it('passes logout props to sidebar', () => {
      const onLogout = vi.fn();
      renderAppShell({ showLogout: true, onLogout }, true);
      expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    });

    it('passes band info to sidebar', () => {
      renderAppShell(
        {
          currentBandName: 'Test Band',
          userBands: [{ id: '1', name: 'Test Band' }],
          onSelectBand: vi.fn(),
        },
        true
      );
      expect(screen.getByText('Test Band')).toBeInTheDocument();
    });
  });
});
