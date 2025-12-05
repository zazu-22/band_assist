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
  /** Practice history page */
  PRACTICE_HISTORY: '/practice-history',
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
 * Helper to build practice route with optional song preselection
 * @param songId - Optional song ID to preselect in the practice room
 * @returns The practice route, with query param if songId provided
 */
export const getPracticeRoute = (songId?: string): string =>
  songId ? `${ROUTES.PRACTICE}?songId=${songId}` : ROUTES.PRACTICE;

/**
 * Navigation items configuration for the sidebar.
 * Maps route identifiers to their display properties.
 */
export const NAV_ITEMS = [
  { id: 'DASHBOARD', path: ROUTES.DASHBOARD, label: 'Dashboard' },
  { id: 'PRACTICE', path: ROUTES.PRACTICE, label: 'Practice Room' },
  { id: 'PRACTICE_HISTORY', path: ROUTES.PRACTICE_HISTORY, label: 'Practice History' },
  { id: 'SETLIST', path: ROUTES.SETLIST, label: 'Setlist Builder' },
  { id: 'SCHEDULE', path: ROUTES.SCHEDULE, label: 'Schedule' },
  { id: 'BAND', path: ROUTES.BAND, label: 'Band Lineup' },
] as const;

/**
 * Check if a path matches a route pattern.
 * Handles exact matches and prefix matches for dynamic routes.
 * Examples:
 * - matchRoute('/songs/123', '/songs') -> true (prefix with slash boundary)
 * - matchRoute('/songs', '/songs') -> true (exact match)
 * - matchRoute('/songs', '/') -> false (root is special-cased)
 * - matchRoute('/', '/') -> true
 *
 * @param pathname - The current URL pathname
 * @param route - The route to match against
 * @returns true if the path matches the route
 */

export const matchRoute = (pathname: string, route: string): boolean => {
  if (route === '/') {
    return pathname === '/';
  }
  // Exact match
  if (pathname === route) return true;
  // Prefix match with slash boundary
  return pathname.startsWith(`${route}/`);
};

/**
 * Get display title for a route pathname.
 * Used by mobile header to show current page name.
 *
 * @param pathname - The current URL pathname
 * @returns The display name for the page, or empty string if unknown
 */
export const getPageTitle = (pathname: string): string => {
  // Check NAV_ITEMS first
  const navItem = NAV_ITEMS.find(item => matchRoute(pathname, item.path));
  if (navItem) return navItem.label;

  // Custom mappings for non-nav routes
  if (pathname === '/settings') return 'Settings';
  if (pathname === '/performance') return 'Performance';
  if (pathname === '/practice-history') return 'Practice History';
  if (pathname.startsWith('/songs/')) return 'Song Details';

  return '';
};
