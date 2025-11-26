import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeProvider';

// Test component to access theme context
function ThemeConsumer() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('system')}>System</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  let mediaQueryListeners: Array<(event: MediaQueryListEvent) => void> = [];
  let systemPrefersDark = true;

  const mockMatchMedia = () => {
    return vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? systemPrefersDark : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn((event: string, callback: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          mediaQueryListeners.push(callback);
        }
      }),
      removeEventListener: vi.fn((event: string, callback: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          mediaQueryListeners = mediaQueryListeners.filter((l) => l !== callback);
        }
      }),
      dispatchEvent: vi.fn(),
    }));
  };

  beforeEach(() => {
    mediaQueryListeners = [];
    systemPrefersDark = true;
    localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
    window.matchMedia = mockMatchMedia();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('uses defaultTheme when no stored preference', () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <ThemeConsumer />
        </ThemeProvider>
      );
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });

    it('uses stored theme preference from localStorage', () => {
      localStorage.setItem('band-assist-theme', 'light');
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });

    it('uses custom storage key', () => {
      localStorage.setItem('custom-theme-key', 'light');
      render(
        <ThemeProvider storageKey="custom-theme-key">
          <ThemeConsumer />
        </ThemeProvider>
      );
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });
  });

  describe('theme switching', () => {
    it('allows switching to light theme', () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        screen.getByText('Light').click();
      });

      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    });

    it('allows switching to dark theme', () => {
      render(
        <ThemeProvider defaultTheme="light">
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        screen.getByText('Dark').click();
      });

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    });

    it('allows switching to system theme', () => {
      systemPrefersDark = true;
      window.matchMedia = mockMatchMedia();

      render(
        <ThemeProvider defaultTheme="light">
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        screen.getByText('System').click();
      });

      expect(screen.getByTestId('theme')).toHaveTextContent('system');
      expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    });

    it('persists theme preference to localStorage', () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        screen.getByText('Light').click();
      });

      expect(localStorage.getItem('band-assist-theme')).toBe('light');
    });
  });

  describe('DOM class management', () => {
    it('adds dark class to documentElement for dark theme', () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <ThemeConsumer />
        </ThemeProvider>
      );
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });

    it('adds light class to documentElement for light theme', () => {
      render(
        <ThemeProvider defaultTheme="light">
          <ThemeConsumer />
        </ThemeProvider>
      );
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('updates class when theme changes', () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(document.documentElement.classList.contains('dark')).toBe(true);

      act(() => {
        screen.getByText('Light').click();
      });

      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('system theme detection', () => {
    it('resolves to dark when system prefers dark', () => {
      systemPrefersDark = true;
      window.matchMedia = mockMatchMedia();

      render(
        <ThemeProvider defaultTheme="system">
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    });

    it('resolves to light when system prefers light', () => {
      systemPrefersDark = false;
      window.matchMedia = mockMatchMedia();

      render(
        <ThemeProvider defaultTheme="system">
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    });
  });

  describe('useTheme hook', () => {
    it('returns initial state when used outside ThemeProvider', () => {
      // Note: The context has a default value (initialState), so it doesn't throw
      // when used outside the provider - it returns the default state instead.
      // This is safe because setTheme is a no-op in the initial state.
      const { result } = renderHook(() => useTheme());

      // Should return the initial state values
      expect(result.current.theme).toBe('system');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(typeof result.current.setTheme).toBe('function');
    });
  });
});
