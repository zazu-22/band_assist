/**
 * Avatar color utilities for consistent member display styling.
 */

/** Tailwind background color classes for avatars */
export type AvatarColorClass =
  | 'bg-red-500'
  | 'bg-blue-500'
  | 'bg-green-500'
  | 'bg-yellow-500'
  | 'bg-purple-500'
  | 'bg-pink-500'
  | 'bg-indigo-500'
  | 'bg-teal-500'
  | 'bg-orange-500'
  | 'bg-muted';

/** Default avatar background color when member has no assigned color */
export const DEFAULT_AVATAR_COLOR: AvatarColorClass = 'bg-muted';

/** Available avatar colors for assignment */
export const AVATAR_COLORS: AvatarColorClass[] = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
];

/** Set of valid avatar colors for runtime validation (immutable) */
const VALID_AVATAR_COLORS: ReadonlySet<AvatarColorClass> = new Set<AvatarColorClass>([
  ...AVATAR_COLORS,
  DEFAULT_AVATAR_COLOR,
]);

/**
 * Get avatar color with fallback to default.
 * Includes runtime validation to ensure only valid Tailwind classes are returned.
 * @param avatarColor - The member's assigned avatar color (may be undefined or legacy value)
 * @returns The avatar color class to use (always a valid Tailwind class)
 */
export function getAvatarColor(avatarColor: AvatarColorClass | string | undefined): AvatarColorClass {
  // Return default if no color provided
  if (!avatarColor) {
    return DEFAULT_AVATAR_COLOR;
  }

  // Validate that the color is in our allowed list to prevent
  // arbitrary class injection and ensure consistent styling
  if (VALID_AVATAR_COLORS.has(avatarColor as AvatarColorClass)) {
    return avatarColor as AvatarColorClass;
  }

  // Fall back to default for any unrecognized color
  return DEFAULT_AVATAR_COLOR;
}

/**
 * Validate and convert a database avatar color value.
 * Unlike getAvatarColor(), this preserves undefined for null/undefined input
 * rather than returning a default. Use this when loading from database.
 * @param dbValue - The avatar_color value from database (may be null, undefined, or legacy string)
 * @returns Valid AvatarColorClass or undefined
 */
export function validateAvatarColor(dbValue: string | null | undefined): AvatarColorClass | undefined {
  if (!dbValue) {
    return undefined;
  }

  if (VALID_AVATAR_COLORS.has(dbValue as AvatarColorClass)) {
    return dbValue as AvatarColorClass;
  }

  // Invalid legacy value - return undefined to allow UI to use default
  return undefined;
}

/**
 * Get the next avatar color for a new member based on existing member count.
 * Cycles through available colors to provide variety.
 * @param memberIndex - Index of the member (0-based)
 * @returns An avatar color class
 */
export function getNextAvatarColor(memberIndex: number): AvatarColorClass {
  return AVATAR_COLORS[memberIndex % AVATAR_COLORS.length];
}
