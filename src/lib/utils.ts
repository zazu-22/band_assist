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

  // Replace control characters (ASCII 0-31) using character code filtering
  sanitized = Array.from(sanitized)
    .filter(char => char.charCodeAt(0) >= 32)
    .join('');

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
 * Common MIME type to file extension mappings for audio and image files.
 */
const MIME_TO_EXTENSION: Record<string, string> = {
  // Audio
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/flac': 'flac',
  'audio/aac': 'aac',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/webm': 'weba',
  // Images
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  // Documents
  'application/pdf': 'pdf',
};

/**
 * Extract file extension from a data URL's MIME type.
 * Data URLs have format: data:[<mediatype>][;base64],<data>
 *
 * @param dataUrl - A data URL string
 * @returns The file extension derived from the MIME type, or undefined
 */
export function extractExtensionFromDataUrl(dataUrl: string): string | undefined {
  if (!dataUrl.startsWith('data:')) {
    return undefined;
  }

  // Extract MIME type: data:audio/wav;base64,... -> audio/wav
  const mimeMatch = dataUrl.match(/^data:([^;,]+)/);
  if (!mimeMatch) {
    return undefined;
  }

  const mimeType = mimeMatch[1].toLowerCase();
  return MIME_TO_EXTENSION[mimeType];
}

/**
 * Extract file extension from a filename or URL.
 * Returns the extension in lowercase without the dot, or undefined if not found.
 * Also handles data URLs by extracting extension from MIME type.
 *
 * @param filenameOrUrl - Filename or URL to extract extension from
 */
export function extractFileExtension(filenameOrUrl: string): string | undefined {
  // Handle data URLs specially
  if (filenameOrUrl.startsWith('data:')) {
    return extractExtensionFromDataUrl(filenameOrUrl);
  }

  // Remove query parameters and hash if URL
  let cleanPath = filenameOrUrl.split('?')[0].split('#')[0];

  // Handle URL-encoded characters
  try {
    cleanPath = decodeURIComponent(cleanPath);
  } catch {
    // Ignore decode errors
  }

  // Extract just the filename part if it's a path/URL
  const filename = cleanPath.split('/').pop() || cleanPath;

  // Find the extension
  const lastDot = filename.lastIndexOf('.');
  if (lastDot > 0 && lastDot < filename.length - 1) {
    const ext = filename.substring(lastDot + 1).toLowerCase();
    // Validate it's a reasonable extension (1-10 chars, alphanumeric)
    if (ext.length >= 1 && ext.length <= 10 && /^[a-z0-9]+$/.test(ext)) {
      return ext;
    }
  }

  return undefined;
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

  // Check if itemName has an extension
  const itemExt = extractFileExtension(itemName);
  if (itemExt) {
    // Remove extension from baseName
    const lastDot = itemName.lastIndexOf('.');
    baseName = itemName.substring(0, lastDot);
  }

  // Use provided extension or fall back to extracted one
  if (!ext) {
    ext = itemExt;
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
