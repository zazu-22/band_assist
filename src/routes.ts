/**
 * Route constants for the application.
 * Centralizes all route paths to eliminate magic strings throughout the codebase.
 */

/**
 * Application route paths.
 * Use these constants instead of hardcoded strings for navigation.
 */
export const ROUTES = {
  /** Dashboard/home page */
  DASHBOARD: '/',
  /** Song detail page - append songId */
  SONG_DETAIL: '/songs',
  /** Setlist builder page */
  SETLIST: '/setlist',
  /** Practice room page */
  PRACTICE: '/practice',
  /** Schedule/events page */
  SCHEDULE: '/schedule',
  /** Band lineup/dashboard page */
  BAND: '/band',
  /** Settings page */
  SETTINGS: '/settings',
  /** Performance mode (full screen) */
  PERFORMANCE: '/performance',
  /** Login page */
  LOGIN: '/login',
  /** Signup page */
  SIGNUP: '/signup',
  /** Password reset page */
  PASSWORD_RESET: '/password-reset',
  /** Password update page */
  PASSWORD_UPDATE: '/password-update',
} as const;

/**
 * Helper to build song detail route
 * @param songId - The song ID
 * @returns The full route path for the song detail page
 */
export const getSongDetailRoute = (songId: string): string => `${ROUTES.SONG_DETAIL}/${songId}`;

/**
 * Helper to build song practice route
 * @param songId - The song ID
 * @returns The full route path for practicing a specific song
 */
export const getSongPracticeRoute = (songId: string): string => `${ROUTES.SONG_DETAIL}/${songId}/practice`;

/**
 * Navigation items configuration for the sidebar.
 * Maps route identifiers to their display properties.
 */
export const NAV_ITEMS = [
  { id: 'DASHBOARD', path: ROUTES.DASHBOARD, label: 'Dashboard' },
  { id: 'PRACTICE', path: ROUTES.PRACTICE, label: 'Practice Room' },
  { id: 'SETLIST', path: ROUTES.SETLIST, label: 'Setlist Builder' },
  { id: 'SCHEDULE', path: ROUTES.SCHEDULE, label: 'Schedule' },
  { id: 'BAND', path: ROUTES.BAND, label: 'Band Lineup' },
] as const;

/**
 * Check if a path matches a route pattern.
 * Handles exact matches and prefix matches for dynamic routes.
 * @param pathname - The current URL pathname
 * @param route - The route to match against
 * @returns true if the path matches the route
 */
export const matchRoute = (pathname: string, route: string): boolean => {
  if (route === '/') {
    return pathname === '/';
  }
  return pathname === route || pathname.startsWith(`${route}/`);
};
