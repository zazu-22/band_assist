import { useState, useEffect } from 'react';

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Tailwind CSS default breakpoints
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

const getBreakpoint = (): Breakpoint => {
  // SSR-safe: default to 'lg' if window is not available
  if (typeof window === 'undefined') return 'lg';

  const width = window.innerWidth;
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  return 'sm';
};

/**
 * Hook to detect the current Tailwind CSS breakpoint.
 * Updates on window resize with debouncing for performance.
 */
export const useBreakpoint = (): Breakpoint => {
  // Lazy initialization using function form to get actual value on first render
  // This avoids layout flash that would occur with a hardcoded default
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(getBreakpoint);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    // Debounced resize handler to avoid excessive re-renders during window resize.
    // 150ms delay balances responsiveness with performance - fast enough to feel
    // responsive but slow enough to batch rapid resize events (e.g., during
    // window drag resizing which can fire 60+ events per second).
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setBreakpoint(getBreakpoint());
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return breakpoint;
};

/**
 * Hook to check if current viewport is mobile (sm or md breakpoint).
 */
export const useIsMobile = (): boolean => {
  const bp = useBreakpoint();
  return bp === 'sm' || bp === 'md';
};

/**
 * Hook to check if current viewport is desktop (lg, xl, or 2xl breakpoint).
 */
export const useIsDesktop = (): boolean => {
  const bp = useBreakpoint();
  return bp === 'lg' || bp === 'xl' || bp === '2xl';
};
