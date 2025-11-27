import { useState, useEffect } from 'react';

/**
 * A custom hook for managing Blob URLs created from Base64 data URIs.
 * Automatically handles creation and cleanup of object URLs to prevent memory leaks.
 *
 * @param dataUri - A Base64 data URI (e.g., "data:audio/mp3;base64,...") or undefined
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
  const [blobUrl, setBlobUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Skip if no data URI or doesn't match expected prefix
    if (!dataUri || !dataUri.startsWith(prefix)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronizing with external Blob API
      setBlobUrl(undefined);
      return;
    }

    let url: string | undefined;

    try {
      // Extract MIME type and base64 content
      const mimeMatch = dataUri.match(/^data:([^;]+);base64,/);
      if (!mimeMatch) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronizing with external Blob API
        setBlobUrl(undefined);
        return;
      }

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
      url = URL.createObjectURL(blob);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronizing with external Blob API
      setBlobUrl(url);
    } catch {
      // Silently handle conversion errors (invalid base64, etc.)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronizing with external Blob API
      setBlobUrl(undefined);
    }

    // Cleanup: revoke the object URL when effect re-runs or unmounts
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [dataUri, prefix]);

  return blobUrl;
}
