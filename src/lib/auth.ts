/**
 * Authentication utility functions.
 */

/**
 * Clears sensitive auth tokens from the URL hash.
 *
 * SECURITY: This should be called after successfully using recovery tokens to:
 * 1. Prevent tokens from appearing in browser history
 * 2. Remove sensitive data from URL before user can copy/share link
 * 3. Keep URL clean for better UX
 *
 * Uses history.replaceState instead of directly modifying hash to avoid
 * triggering navigation events or React Router re-renders.
 *
 * @returns true if tokens were cleared, false if no tokens found or not supported
 */
export function clearAuthTokensFromUrl(): boolean {
  const hash = window.location.hash;

  // Check if hash contains sensitive auth data
  const hasAuthTokens = hash.includes('access_token') || hash.includes('type=recovery');

  if (!hasAuthTokens) {
    return false;
  }

  // Use replaceState to avoid navigation event
  if (window.history.replaceState) {
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search
    );
    return true;
  }

  return false;
}

/**
 * Checks if the current URL contains a password recovery token.
 * @returns true if recovery token is present
 */
export function hasRecoveryToken(): boolean {
  const hash = window.location.hash;
  const hashParams = new URLSearchParams(hash.substring(1));
  return hashParams.has('access_token') && hashParams.get('type') === 'recovery';
}
