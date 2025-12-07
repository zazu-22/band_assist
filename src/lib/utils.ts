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
 * Handles time ranges from seconds to weeks, with fallback to absolute date.
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Handle future dates (clock skew)
  if (diffMs < 0) {
    return 'just now';
  }

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
  if (diffHours < 24) {
    return `${diffHours} hours ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return '1 day ago';
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) {
    return '1 week ago';
  }
  if (diffWeeks < 4) {
    return `${diffWeeks} weeks ago`;
  }

  // For very old saves, show absolute date
  return date.toLocaleDateString();
}

/**
 * Sanitize a string for use as a filename.
 * Removes or replaces characters that are invalid in Windows/Mac/Linux filesystems.
 *
 * Invalid characters: / \ : * ? " < > |
 * Also handles control characters and leading/trailing spaces/dots.
 */
export function sanitizeFilename(filename: string): string {
  // Replace invalid characters with underscores
  let sanitized = filename.replace(/[/\\:*?"<>|]/g, '_');

  // Replace control characters (ASCII 0-31)
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\u0000-\u001f]/g, '');

  // Replace multiple consecutive underscores/spaces with single underscore
  sanitized = sanitized.replace(/[_\s]+/g, '_');

  // Trim leading/trailing underscores and spaces
  sanitized = sanitized.replace(/^[_\s]+|[_\s]+$/g, '');

  // Remove leading dots (hidden files on Unix, problematic on Windows)
  sanitized = sanitized.replace(/^\.+/, '');

  // Ensure we have a valid filename (fallback if everything was stripped)
  if (!sanitized) {
    return 'download';
  }

  // Limit length to 200 characters (leaves room for extension and path)
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  return sanitized;
}

/**
 * Generate a download filename that includes the song name.
 * Format: "Song Title - Chart Name.ext" or "Song Title - description.ext"
 *
 * @param songTitle - The title of the song
 * @param itemName - The name of the item being downloaded (chart name, "backing_track", etc.)
 * @param extension - Optional file extension (without dot). If not provided, extracts from itemName.
 */
export function generateDownloadFilename(
  songTitle: string,
  itemName: string,
  extension?: string
): string {
  // Extract extension from itemName if not provided
  let ext = extension;
  let baseName = itemName;

  if (!ext) {
    const lastDot = itemName.lastIndexOf('.');
    if (lastDot > 0 && lastDot < itemName.length - 1) {
      ext = itemName.substring(lastDot + 1);
      baseName = itemName.substring(0, lastDot);
    }
  }

  // Sanitize both parts
  const sanitizedSongTitle = sanitizeFilename(songTitle);
  const sanitizedItemName = sanitizeFilename(baseName);

  // Combine: "Song Title - Item Name"
  let filename = `${sanitizedSongTitle} - ${sanitizedItemName}`;

  // Add extension if present
  if (ext) {
    filename = `${filename}.${ext.toLowerCase()}`;
  }

  return filename;
}
