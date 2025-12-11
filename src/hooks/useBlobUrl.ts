import { useMemo, useEffect, useState, useRef, useCallback } from 'react';

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
 * For remote URLs (https://), this hook fetches the content and creates a local blob URL.
 * This enables proper seeking in audio/video elements, which require random access to the file.
 * Without this, the Edge Function URLs don't support HTTP Range requests, causing seek to fail.
 *
 * @param dataUri - A Base64 data URI (e.g., "data:audio/mp3;base64,..."), remote URL, or undefined
 * @param prefix - Required prefix for base64 data URIs (default: "data:audio")
 * @returns The object URL for the blob, or undefined if conversion fails or dataUri is empty
 *
 * @example
 * // Convert a base64 audio data URI to a playable URL
 * const audioUrl = useBlobUrl(song?.backingTrackUrl);
 * return <audio src={audioUrl} />;
 *
 * @remarks
 * - For base64: Only processes URIs that start with the specified prefix (default: "data:audio")
 * - For remote URLs: Fetches the entire file and creates a blob URL for seeking support
 * - Automatically revokes the previous URL when dataUri changes
 * - Handles conversion errors gracefully by returning undefined
 */
export function useBlobUrl(
  dataUri: string | undefined,
  prefix: string = 'data:audio'
): string | undefined {
  // State for fetched blob URLs (remote URLs need async fetch)
  const [fetchedBlobUrl, setFetchedBlobUrl] = useState<string | undefined>(undefined);
  // Track the URL we're currently fetching to avoid duplicate fetches
  const fetchingUrlRef = useRef<string | undefined>(undefined);
  // Track the previous fetched blob URL for cleanup
  const previousBlobUrlRef = useRef<string | undefined>(undefined);

  // Determine if this is a remote URL that needs fetching
  const isRemoteUrl = dataUri?.startsWith('https://') || dataUri?.startsWith('http://');

  // Create blob URL synchronously for base64 data URIs
  const syncBlobUrl = useMemo(() => {
    if (!dataUri) return undefined;

    // Remote URLs are handled asynchronously
    if (isRemoteUrl) {
      return undefined;
    }

    // Pass through existing blob URLs
    if (dataUri.startsWith('blob:')) {
      return dataUri;
    }

    // Convert base64 data URIs to blob URLs
    const result = dataUriToBlobUrl(dataUri, prefix);
    // Log conversion failures to help debug backing track issues
    if (!result && dataUri) {
      console.warn('[useBlobUrl] Failed to convert data URI to blob URL', {
        prefix,
        dataUriPrefix: dataUri.substring(0, 50) + '...',
      });
    }
    return result;
  }, [dataUri, prefix, isRemoteUrl]);

  // Callback to handle successful fetch
  const handleFetchSuccess = useCallback((blobUrl: string) => {
    // Cleanup previous blob URL before setting new one
    if (previousBlobUrlRef.current) {
      URL.revokeObjectURL(previousBlobUrlRef.current);
    }
    previousBlobUrlRef.current = blobUrl;
    setFetchedBlobUrl(blobUrl);
  }, []);

  // Fetch remote URLs and convert to blob URLs for seeking support
  useEffect(() => {
    // If not a remote URL, nothing to fetch
    if (!dataUri || !isRemoteUrl) {
      // Cleanup previous fetched URL when switching away from remote
      if (previousBlobUrlRef.current) {
        URL.revokeObjectURL(previousBlobUrlRef.current);
        previousBlobUrlRef.current = undefined;
      }
      fetchingUrlRef.current = undefined;
      return;
    }

    // Skip if we're already fetching this exact URL
    if (fetchingUrlRef.current === dataUri) {
      return;
    }

    // Cleanup previous blob URL when URL changes
    if (previousBlobUrlRef.current) {
      URL.revokeObjectURL(previousBlobUrlRef.current);
      previousBlobUrlRef.current = undefined;
    }
    fetchingUrlRef.current = dataUri;

    const controller = new AbortController();
    const urlToFetch = dataUri;

    fetch(urlToFetch, { signal: controller.signal })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        // Only update state if we're still interested in this URL
        if (fetchingUrlRef.current === urlToFetch) {
          const blobUrl = URL.createObjectURL(blob);
          handleFetchSuccess(blobUrl);
        }
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          console.error('[useBlobUrl] Failed to fetch remote URL:', error);
        }
      })
      .finally(() => {
        if (fetchingUrlRef.current === urlToFetch) {
          fetchingUrlRef.current = undefined;
        }
      });

    return () => {
      controller.abort();
    };
  }, [dataUri, isRemoteUrl, handleFetchSuccess]);

  // Cleanup effect: revoke URL when it changes or component unmounts
  useEffect(() => {
    const urlToCleanup = syncBlobUrl;
    // Return cleanup function that revokes the current URL
    // Only revoke blob: URLs we created from base64, not passed-through blob URLs
    return () => {
      if (urlToCleanup && urlToCleanup.startsWith('blob:') && !dataUri?.startsWith('blob:')) {
        URL.revokeObjectURL(urlToCleanup);
      }
    };
  }, [syncBlobUrl, dataUri]);

  // Cleanup fetched blob URL on unmount
  useEffect(() => {
    return () => {
      if (previousBlobUrlRef.current) {
        URL.revokeObjectURL(previousBlobUrlRef.current);
      }
    };
  }, []);

  // Return the appropriate URL
  // For remote URLs, return undefined while fetching, then the blob URL once ready
  if (isRemoteUrl) {
    return fetchedBlobUrl;
  }
  return syncBlobUrl;
}
