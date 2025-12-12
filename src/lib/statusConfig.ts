/**
 * Shared status configuration for consistent badge colors throughout the app.
 *
 * Color scheme:
 * - Band status uses bold semantic colors (success/info/warning)
 * - User status uses softer variants (user-success/user-info/user-warning)
 *
 * This ensures visual distinction between:
 * - Band's official song status (group context)
 * - User's personal learning progress (individual context)
 */

import type { Song, UserSongStatus } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export type BandStatus = Song['status'];

/** Badge variants for band status (bold colors) */
export type BandStatusVariant = 'success' | 'info' | 'warning';

/** Badge variants for user status (softer colors) */
export type UserStatusVariant = 'user-success' | 'user-info' | 'user-warning' | 'outline';

// =============================================================================
// BAND STATUS CONFIGURATION
// =============================================================================

/**
 * Maps band song status to Badge semantic variants.
 *
 * Color mapping:
 * - 'Performance Ready' → 'success' (green) - song is gig-ready
 * - 'In Progress' → 'info' (blue) - band is actively working on it
 * - 'To Learn' → 'warning' (amber) - needs attention
 */
export const BAND_STATUS_VARIANT_MAP: Record<BandStatus, BandStatusVariant> = {
  'Performance Ready': 'success',
  'In Progress': 'info',
  'To Learn': 'warning',
} as const;

/**
 * Get the Badge variant for a band status.
 *
 * Falls back to 'warning' for unknown statuses to draw attention to unexpected
 * states that may indicate a bug or data inconsistency. Warning (amber) is chosen
 * over destructive (red) as it signals "needs attention" without implying error.
 *
 * @param status - The band's official song status
 * @returns Badge variant name
 */
export function getBandStatusVariant(status: BandStatus): BandStatusVariant {
  return BAND_STATUS_VARIANT_MAP[status] ?? 'warning';
}

// =============================================================================
// USER STATUS CONFIGURATION
// =============================================================================

/**
 * Maps user learning status to Badge semantic variants.
 *
 * Color mapping (softer variants for visual distinction from band status):
 * - 'Mastered' → 'user-success' (soft green) - user has fully learned the song
 * - 'Learned' → 'user-info' (soft blue) - user knows the song
 * - 'Learning' → 'user-warning' (soft amber) - user is actively practicing
 * - 'Not Started' → 'outline' (neutral) - user hasn't begun
 */
export const USER_STATUS_VARIANT_MAP: Record<UserSongStatus, UserStatusVariant> = {
  'Mastered': 'user-success',
  'Learned': 'user-info',
  'Learning': 'user-warning',
  'Not Started': 'outline',
} as const;

/**
 * Get the Badge variant for a user learning status.
 * @param status - The user's personal learning status
 * @returns Badge variant name
 */
export function getUserStatusVariant(status: UserSongStatus | undefined): UserStatusVariant {
  if (!status) return 'outline';
  return USER_STATUS_VARIANT_MAP[status] ?? 'outline';
}

// =============================================================================
// STATUS OPTIONS (for dropdowns/filters)
// =============================================================================

/** User status options for dropdown menus and filters */
export const USER_STATUS_OPTIONS: { value: UserSongStatus; label: string }[] = [
  { value: 'Not Started', label: 'Not Started' },
  { value: 'Learning', label: 'Learning' },
  { value: 'Learned', label: 'Learned' },
  { value: 'Mastered', label: 'Mastered' },
];

/**
 * Band status options for dropdown menus and filters.
 *
 * Ordered from least to most ready (To Learn → In Progress → Performance Ready)
 * to match typical workflow progression. Exported for consistency when building
 * band status filter/selection UI components.
 */
export const BAND_STATUS_OPTIONS: { value: BandStatus; label: string }[] = [
  { value: 'To Learn', label: 'To Learn' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Performance Ready', label: 'Performance Ready' },
];
