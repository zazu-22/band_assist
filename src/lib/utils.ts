import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind-aware conflict resolution.
 * Uses clsx for conditional classes and tailwind-merge for deduplication.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date as a relative time string (e.g., "just now", "2 minutes ago").
 * Used for displaying save status indicators.
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 5) {
    return 'just now';
  }
  if (diffSeconds < 60) {
    return `${diffSeconds} seconds ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes === 1) {
    return '1 minute ago';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) {
    return '1 hour ago';
  }
  return `${diffHours} hours ago`;
}
