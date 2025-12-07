import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combine multiple class-name inputs into a single class string with Tailwind-aware conflict resolution.
 *
 * @param inputs - One or more class name inputs (strings, arrays, objects, or mixed values) to be merged
 * @returns A single string containing the merged class names with conflicting Tailwind utilities resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Produce a human-readable relative time for the given date.
 *
 * @param date - The date to compare against the current time
 * @returns A relative time string such as `"just now"`, `"2 seconds ago"`, `"1 minute ago"`, `"3 days ago"`, or an absolute locale-formatted date for timestamps older than four weeks
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
  if (diffSeconds === 1) {
    return '1 second ago';
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
 * Windows reserved filenames that cannot be used (case-insensitive).
 * These names are reserved regardless of extension.
 */
const WINDOWS_RESERVED_NAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

/**
 * Maximum filename length (excluding extension).
 * Leaves room for extension and path on most filesystems.
 */
const MAX_FILENAME_LENGTH = 200;

/**
 * Produce a filesystem-safe filename by removing or normalizing characters and whitespace.
 *
 * The returned name replaces invalid filesystem characters with underscores, removes ASCII
 * control characters, collapses consecutive underscores and spaces to a single underscore,
 * trims leading/trailing underscores, spaces, and dots, strips leading dots, handles Windows
 * reserved names, and truncates to at most 200 characters. If all characters are removed,
 * returns `"download"`.
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

  // Trim leading/trailing underscores, spaces, and dots (dots problematic on Windows)
  // This also handles leading dots (hidden files on Unix)
  sanitized = sanitized.replace(/^[_\s.]+|[_\s.]+$/g, '');

  // Ensure we have a valid filename (fallback if everything was stripped)
  if (!sanitized) {
    return 'download';
  }

  // Handle Windows reserved names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
  // Check only the part before the first dot to catch "con.txt" etc.
  const [root] = sanitized.split('.');
  if (WINDOWS_RESERVED_NAMES.has(root.toLowerCase())) {
    sanitized = `_${sanitized}`;
  }

  // Limit length to MAX_FILENAME_LENGTH characters (leaves room for extension and path)
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    sanitized = sanitized.substring(0, MAX_FILENAME_LENGTH);
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
  'audio/webm': 'webm',
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
 * Derives a file extension from a data URL's MIME type.
 *
 * @param dataUrl - The data URL to inspect (should start with `data:`)
 * @returns The corresponding file extension (for example, `png` or `mp3`), or `undefined` if the input is not a valid data URL or the MIME type is not recognized
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
 * Extracts a file extension from a filename, URL, or data URL.
 *
 * For data URLs, derives the extension from the MIME type. For URLs or paths,
 * query strings and hashes are ignored and the last path segment is inspected.
 * The returned extension is lowercase and must be 1–10 alphanumeric characters.
 *
 * @param filenameOrUrl - Filename, path, URL, or data URL to extract the extension from
 * @returns The extension without a leading dot, or `undefined` if no valid extension is found
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

  // Add extension if present (validate length to prevent negative maxBaseLength)
  // Strip leading dots in case caller passes ".mp3" instead of "mp3"
  const normalizedExt = ext?.toLowerCase().trim().replace(/^\.+/, '');
  if (normalizedExt && normalizedExt.length <= 10) {
    // Calculate max base length to leave room for extension
    const extWithDot = `.${normalizedExt}`;
    const maxBaseLength = MAX_FILENAME_LENGTH - extWithDot.length;

    // Truncate base filename if needed to fit within total limit
    if (filename.length > maxBaseLength) {
      filename = filename.substring(0, maxBaseLength);
      // Clean up any trailing spaces or dashes from truncation
      filename = filename.replace(/[\s-]+$/, '');
    }

    filename = `${filename}${extWithDot}`;
  } else if (filename.length > MAX_FILENAME_LENGTH) {
    // No extension, just truncate to max length
    filename = filename.substring(0, MAX_FILENAME_LENGTH);
    // Clean up any trailing spaces or dashes from truncation
    filename = filename.replace(/[\s-]+$/, '');
  }

  return filename;
}