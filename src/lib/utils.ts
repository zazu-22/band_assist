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
 * Produce a human-readable relative time for the given date.
 *
 * @returns A string like "just now", "2 minutes ago", "1 day ago", "3 weeks ago", or an absolute locale-formatted date for older timestamps.
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
 * Produce a filesystem-safe filename by removing or normalizing characters and whitespace.
 *
 * The returned name replaces invalid filesystem characters with underscores, removes ASCII
 * control characters, collapses consecutive underscores and spaces to a single underscore,
 * trims leading/trailing underscores and spaces, strips leading dots, and truncates to
 * at most 200 characters. If all characters are removed, returns `"download"`.
 *
 * @param filename - Original filename string to sanitize
 * @returns A sanitized filename safe for use on common filesystems
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
 * Create a safe download filename combining a song title and an item name, with an optional extension.
 *
 * @param songTitle - The song title to include in the filename
 * @param itemName - The item name or source filename; used as the base name and to derive an extension if `extension` is omitted
 * @param extension - Optional file extension without a leading dot; when omitted, the extension is extracted from `itemName` if present
 * @returns The constructed, sanitized filename in the form "Song Title - Item Name" with the extension appended in lowercase when present
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