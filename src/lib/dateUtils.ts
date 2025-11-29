/**
 * Date utilities for consistent local-time date handling.
 *
 * IMPORTANT: JavaScript's `new Date("YYYY-MM-DD")` parses date-only strings
 * as UTC midnight, causing off-by-one errors when displayed in local time
 * for users west of UTC. These utilities ensure dates are always parsed
 * and compared in local time.
 */

/** Regex pattern for YYYY-MM-DD format */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a YYYY-MM-DD string as local midnight (not UTC).
 *
 * Use this instead of `new Date(dateStr)` to avoid timezone issues.
 *
 * @example
 * // Wrong - parses as UTC, shows wrong date in PST:
 * new Date("2024-11-29") // Nov 28 4pm in PST
 *
 * // Correct - parses as local midnight:
 * parseLocalDate("2024-11-29") // Nov 29 12am in PST
 *
 * @throws Error if dateStr is not in YYYY-MM-DD format or represents an invalid date
 *
 * @remarks
 * This function intentionally throws on invalid input rather than returning null.
 * Callers should ensure dates are validated at system boundaries (e.g., form input,
 * API responses) before storage. If a date reaches this function, it should be valid
 * per the database schema. An exception here indicates data corruption that should
 * surface immediately rather than fail silently.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr || !DATE_PATTERN.test(dateStr)) {
    throw new Error(`Invalid date format: "${dateStr}". Expected YYYY-MM-DD`);
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed

  // Validate the date wasn't rolled over (e.g., Feb 30 -> Mar 2)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Invalid date: "${dateStr}" does not exist`);
  }

  return date;
}

/**
 * Get today at local midnight for consistent date comparisons.
 */
export function getLocalToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Calculate whole days between two dates (ignoring time component).
 *
 * Both dates are normalized to midnight, so the millisecond difference
 * is always a multiple of 86400000 (24 * 60 * 60 * 1000). Math.trunc
 * handles both positive and negative values correctly by rounding toward zero.
 *
 * @returns Positive if `to` is in the future, negative if in the past, 0 if same day.
 */
export function daysBetween(from: Date, to: Date): number {
  const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toMidnight = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const diffMs = toMidnight.getTime() - fromMidnight.getTime();
  return Math.trunc(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format relative days as human-readable string.
 *
 * @returns "Today", "Tomorrow", "Yesterday", "in Xd", or "Xd ago"
 */
export function formatDaysUntil(dateStr: string): string {
  const days = daysBetween(getLocalToday(), parseLocalDate(dateStr));

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days < 0) return `${Math.abs(days)}d ago`;
  return `in ${days}d`;
}
