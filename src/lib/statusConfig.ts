/**
 * Shared status configuration for consistent badge colors throughout the app.
 *
 * Color scheme:
 * - Band status uses bold semantic colors (success/info/warning)
 * - User status uses softer variants (user-success/user-info/user-warning)
 * - Neutral states (Not Started, undefined) use the shared 'outline' variant
 *   intentionally - there's no user-outline because neutral appearance should
 *   be consistent across contexts
 *
 * This ensures visual distinction between:
 * - Band's official song status (group context)
 * - User's personal learning progress (individual context)
 */

import type { Song, UserSongStatus, PracticePriority } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export type BandStatus = Song['status'];

/** Badge variants for band status (bold colors) */
export type BandStatusVariant = 'success' | 'info' | 'warning';

/**
 * Badge variants for user status (softer colors).
 * Note: 'outline' is the shared neutral variant - no user-outline exists because
 * the neutral/unstarted appearance should be consistent across all contexts.
 */
export type UserStatusVariant = 'user-success' | 'user-info' | 'user-warning' | 'outline';

/** Readonly status option for dropdown menus and filters */
export type StatusOption<T extends string> = Readonly<{ value: T; label: T }>;

/** Readonly priority option for dropdown menus (label can differ from value) */
export type PriorityOption = Readonly<{ value: PracticePriority | null; label: string }>;

/**
 * Badge variants for priority (uses existing semantic colors).
 * Note: 'outline' is used for "None" state with additional opacity styling.
 */
export type PriorityVariant = 'destructive' | 'warning' | 'info' | 'outline';

/** Default variant for user status when undefined or unknown */
export const DEFAULT_USER_STATUS_VARIANT: UserStatusVariant = 'outline';

/** Default variant for priority when null/undefined (no priority set) */
export const DEFAULT_PRIORITY_VARIANT: PriorityVariant = 'outline';

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
 *
 * Falls back to DEFAULT_USER_STATUS_VARIANT ('outline') for undefined or unknown
 * statuses, providing a neutral appearance that doesn't imply any particular state.
 *
 * @param status - The user's personal learning status
 * @returns Badge variant name
 */
export function getUserStatusVariant(status: UserSongStatus | undefined): UserStatusVariant {
  if (!status) return DEFAULT_USER_STATUS_VARIANT;
  return USER_STATUS_VARIANT_MAP[status] ?? DEFAULT_USER_STATUS_VARIANT;
}

// =============================================================================
// STATUS OPTIONS (for dropdowns/filters)
// =============================================================================

/**
 * User status options for dropdown menus and filters.
 * Readonly to prevent accidental mutation by consumers.
 */
export const USER_STATUS_OPTIONS: readonly StatusOption<UserSongStatus>[] = [
  { value: 'Not Started', label: 'Not Started' },
  { value: 'Learning', label: 'Learning' },
  { value: 'Learned', label: 'Learned' },
  { value: 'Mastered', label: 'Mastered' },
] as const;

/**
 * Band status options for dropdown menus and filters.
 * Readonly to prevent accidental mutation by consumers.
 *
 * Ordered from least to most ready (To Learn → In Progress → Performance Ready)
 * to match typical workflow progression. Exported for consistency when building
 * band status filter/selection UI components.
 */
export const BAND_STATUS_OPTIONS: readonly StatusOption<BandStatus>[] = [
  { value: 'To Learn', label: 'To Learn' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Performance Ready', label: 'Performance Ready' },
] as const;

// =============================================================================
// PRIORITY CONFIGURATION
// =============================================================================

/**
 * Maps practice priority to Badge semantic variants.
 *
 * Color mapping:
 * - 'high' → 'destructive' (red) - needs immediate attention
 * - 'medium' → 'warning' (amber) - moderate priority
 * - 'low' → 'info' (blue) - lower priority
 *
 * Note: null/undefined priorities use DEFAULT_PRIORITY_VARIANT ('outline')
 * with additional opacity styling in the UI component.
 */
export const PRIORITY_VARIANT_MAP: Record<PracticePriority, PriorityVariant> = {
  high: 'destructive',
  medium: 'warning',
  low: 'info',
} as const;

/**
 * Get the Badge variant for a practice priority.
 *
 * Falls back to DEFAULT_PRIORITY_VARIANT ('outline') for null, undefined,
 * or unknown values. The UI should apply opacity-50 styling to outline
 * badges to indicate "no priority set" state.
 *
 * @param priority - The practice priority value
 * @returns Badge variant name
 */
export function getPriorityVariant(priority: PracticePriority | null | undefined): PriorityVariant {
  if (!priority) return DEFAULT_PRIORITY_VARIANT;
  return PRIORITY_VARIANT_MAP[priority] ?? DEFAULT_PRIORITY_VARIANT;
}

/**
 * Get the display label for a practice priority.
 *
 * Capitalizes the priority value for display, or returns 'None' for null/undefined.
 *
 * @param priority - The practice priority value
 * @returns Display label string
 */
export function getPriorityLabel(priority: PracticePriority | null | undefined): string {
  if (!priority) return 'None';
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

/**
 * Priority options for dropdown menus.
 * Readonly to prevent accidental mutation by consumers.
 *
 * Includes 'None' option (null value) first, then ordered from low to high
 * to match typical selection flow where users start with no priority and
 * escalate as needed.
 */
export const PRIORITY_OPTIONS: readonly PriorityOption[] = [
  { value: null, label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;
