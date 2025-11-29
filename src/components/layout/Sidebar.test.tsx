import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { SidebarProvider } from './SidebarProvider';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { TooltipProvider } from '@/components/primitives/tooltip';

// Helper to render Sidebar with all required providers
function renderSidebar(props: Parameters<typeof Sidebar>[0] = {}) {
  return render(
    <MemoryRouter>
      <ThemeProvider defaultTheme="dark">
        <SidebarProvider>
          <TooltipProvider>
            <Sidebar {...props} />
          </TooltipProvider>
        </SidebarProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('Sidebar', () => {
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
    it('renders brand logo', () => {
      renderSidebar();
      expect(screen.getByText('BAND')).toBeInTheDocument();
      expect(screen.getByText('ASSIST')).toBeInTheDocument();
    });

    it('renders navigation items', () => {
      renderSidebar();
      expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /practice room/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /setlist builder/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /schedule/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /band lineup/i })).toBeInTheDocument();
    });

    it('renders performance mode button', () => {
      renderSidebar();
      expect(screen.getByRole('button', { name: /performance mode/i })).toBeInTheDocument();
    });

    it('renders settings button', () => {
      renderSidebar();
      expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    });

    it('renders collapse toggle button', () => {
      renderSidebar();
      expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();
    });

    it('renders theme toggle', () => {
      renderSidebar();
      expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
    });
  });

  describe('logout button', () => {
    it('does not render logout when showLogout is false', () => {
      renderSidebar({ showLogout: false });
      expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
    });

    it('renders logout button when showLogout is true and onLogout provided', () => {
      const onLogout = vi.fn();
      renderSidebar({ showLogout: true, onLogout });
      expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    });

    it('calls onLogout when logout button is clicked', async () => {
      const user = userEvent.setup();
      const onLogout = vi.fn();
      renderSidebar({ showLogout: true, onLogout });

      await user.click(screen.getByRole('button', { name: /log out/i }));
      expect(onLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('band selector', () => {
    it('does not render when no band data provided', () => {
      renderSidebar();
      expect(screen.queryByText('Test Band')).not.toBeInTheDocument();
    });

    it('renders band selector when band data provided', () => {
      renderSidebar({
        currentBandName: 'Test Band',
        userBands: [{ id: '1', name: 'Test Band' }],
        onSelectBand: vi.fn(),
      });
      expect(screen.getByText('Test Band')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('highlights current route', () => {
      render(
        <MemoryRouter initialEntries={['/setlist']}>
          <ThemeProvider defaultTheme="dark">
            <SidebarProvider>
              <TooltipProvider>
                <Sidebar />
              </TooltipProvider>
            </SidebarProvider>
          </ThemeProvider>
        </MemoryRouter>
      );

      const setlistButton = screen.getByRole('button', { name: /setlist builder/i });
      expect(setlistButton).toHaveAttribute('aria-current', 'page');
    });

    it('does not highlight non-current routes', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <ThemeProvider defaultTheme="dark">
            <SidebarProvider>
              <TooltipProvider>
                <Sidebar />
              </TooltipProvider>
            </SidebarProvider>
          </ThemeProvider>
        </MemoryRouter>
      );

      const setlistButton = screen.getByRole('button', { name: /setlist builder/i });
      expect(setlistButton).not.toHaveAttribute('aria-current');
    });
  });

  describe('accessibility', () => {
    it('has main navigation landmark', () => {
      renderSidebar();
      expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
    });

    it('all nav buttons have aria-labels', () => {
      renderSidebar();
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });

  describe('collapse behavior', () => {
    it('toggles collapsed state when collapse button is clicked', async () => {
      const user = userEvent.setup();
      renderSidebar();

      const collapseButton = screen.getByRole('button', { name: /collapse sidebar/i });
      await user.click(collapseButton);

      // After collapse, button should now say "Expand"
      expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(Sidebar.displayName).toBe('Sidebar');
    });
  });
});
