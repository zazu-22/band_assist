import { useMemo, useEffect } from 'react';

/**
 * Converts a Base64 data URI to a Blob URL.
 * Returns undefined if the data URI is invalid or doesn't match the expected format.
 */
function dataUriToBlobUrl(dataUri: string, prefix: string): string | undefined {
  if (!dataUri.startsWith(prefix)) {
    return undefined;
  }

  const mimeMatch = dataUri.match(/^data:([^;]+);base64,/);
  if (!mimeMatch) {
    return undefined;
  }

  try {
    const mime = mimeMatch[1];
    const base64 = dataUri.split(',')[1];

    // Decode base64 to binary
    const byteCharacters = atob(base64);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    // Create blob and object URL
    const blob = new Blob([byteNumbers], { type: mime });
    return URL.createObjectURL(blob);
  } catch {
    return undefined;
  }
}

/**
 * A custom hook for managing Blob URLs created from Base64 data URIs.
 * Automatically handles creation and cleanup of object URLs to prevent memory leaks.
 *
 * @param dataUri - A Base64 data URI (e.g., "data:audio/mp3;base64,...") or undefined
 * @param prefix - Required prefix for the data URI (default: "data:audio")
 * @returns The object URL for the blob, or undefined if conversion fails or dataUri is empty
 *
 * @example
 * // Convert a base64 audio data URI to a playable URL
 * const audioUrl = useBlobUrl(song?.backingTrackUrl);
 * return <audio src={audioUrl} />;
 *
 * @remarks
 * - Only processes URIs that start with the specified prefix (default: "data:audio")
 * - Automatically revokes the previous URL when dataUri changes
 * - Handles conversion errors gracefully by returning undefined
 */
export function useBlobUrl(
  dataUri: string | undefined,
  prefix: string = 'data:audio'
): string | undefined {
  // Create blob URL synchronously during render via useMemo
  // This is safe because URL.createObjectURL is a pure function for the same input
  const blobUrl = useMemo(() => {
    if (!dataUri) return undefined;
    const result = dataUriToBlobUrl(dataUri, prefix);
    // Log conversion failures to help debug backing track issues
    if (!result && dataUri) {
      console.warn('[useBlobUrl] Failed to convert data URI to blob URL', {
        prefix,
        dataUriPrefix: dataUri.substring(0, 50) + '...',
      });
    }
    return result;
  }, [dataUri, prefix]);

  // Cleanup effect: revoke URL when it changes or component unmounts
  useEffect(() => {
    // Return cleanup function that revokes the current URL
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  return blobUrl;
}
