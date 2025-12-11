import { useMemo, useEffect, useState, useRef } from 'react';

/** Return type for useBlobUrl hook */
export interface UseBlobUrlResult {
  /** The blob URL, or undefined if not available */
  url: string | undefined;
  /** Whether a remote URL is currently being fetched */
  isLoading: boolean;
  /** Error that occurred while fetching a remote URL, or null if no error */
  error: Error | null;
}

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
 * @returns Object with `url` (blob URL or undefined) and `isLoading` (true while fetching remote URLs)
 *
 * @example
 * // Convert a base64 audio data URI to a playable URL
 * const { url: audioUrl, isLoading } = useBlobUrl(song?.backingTrackUrl);
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
): UseBlobUrlResult {
  // State: the successfully fetched result (sourceUrl + blobUrl pair)
  // Only updated when fetch completes successfully or fails
  const [fetchedData, setFetchedData] = useState<{
    sourceUrl: string;
    blobUrl: string;
  } | null>(null);

  // Error state for failed remote URL fetches
  const [fetchError, setFetchError] = useState<{
    sourceUrl: string;
    error: Error;
  } | null>(null);

  // Ref to track current fetch - doesn't trigger re-renders
  const currentFetchRef = useRef<{
    url: string;
    controller: AbortController;
  } | null>(null);

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

  // Handle remote URL fetching
  useEffect(() => {
    // Not a remote URL - abort any pending fetch
    if (!dataUri || !isRemoteUrl) {
      if (currentFetchRef.current) {
        currentFetchRef.current.controller.abort();
        currentFetchRef.current = null;
      }
      return;
    }

    // Already fetched this URL - nothing to do
    if (fetchedData?.sourceUrl === dataUri) {
      return;
    }

    // Already fetching this URL - nothing to do
    if (currentFetchRef.current?.url === dataUri) {
      return;
    }

    // Abort previous fetch if any
    if (currentFetchRef.current) {
      currentFetchRef.current.controller.abort();
    }

    // Start new fetch
    // Note: We don't need to clear error state here as errors are keyed by sourceUrl
    // A new fetch for a different URL won't show the old error (see return logic below)
    const controller = new AbortController();
    currentFetchRef.current = { url: dataUri, controller };
    const urlToFetch = dataUri;

    fetch(urlToFetch, { signal: controller.signal })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        // Only update if this is still the current fetch
        if (currentFetchRef.current?.url === urlToFetch) {
          const blobUrl = URL.createObjectURL(blob);
          setFetchedData({ sourceUrl: urlToFetch, blobUrl });
          setFetchError(null);
          currentFetchRef.current = null;
        }
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          console.error('[useBlobUrl] Failed to fetch remote URL:', error);
          // Set error state for non-abort errors
          if (currentFetchRef.current?.url === urlToFetch) {
            const fetchErr = error instanceof Error ? error : new Error(String(error));
            setFetchError({ sourceUrl: urlToFetch, error: fetchErr });
          }
        }
        // Clear current fetch ref on error (but not on abort)
        if (currentFetchRef.current?.url === urlToFetch && error.name !== 'AbortError') {
          currentFetchRef.current = null;
        }
      });

    // Cleanup on unmount - only abort if we're still the current fetch
    return () => {
      // Only abort if this controller is still the current one
      // This prevents aborting on StrictMode double-invoke
      if (currentFetchRef.current?.controller === controller) {
        controller.abort();
        currentFetchRef.current = null;
      }
    };
  }, [dataUri, isRemoteUrl, fetchedData?.sourceUrl]);

  // Cleanup old blob URLs when fetchedData changes
  useEffect(() => {
    const blobUrl = fetchedData?.blobUrl;
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [fetchedData?.blobUrl]);

  // Cleanup sync blob URL when it changes or component unmounts
  useEffect(() => {
    const urlToCleanup = syncBlobUrl;
    return () => {
      if (urlToCleanup && urlToCleanup.startsWith('blob:') && !dataUri?.startsWith('blob:')) {
        URL.revokeObjectURL(urlToCleanup);
      }
    };
  }, [syncBlobUrl, dataUri]);

  // Compute return values
  if (isRemoteUrl && dataUri) {
    // Remote URL: check if we have fetched data for this specific URL
    const hasFetchedData = fetchedData?.sourceUrl === dataUri;
    const hasError = fetchError?.sourceUrl === dataUri;
    const url = hasFetchedData ? fetchedData.blobUrl : undefined;
    // Loading if we have a remote URL but haven't fetched it yet and no error
    const isLoading = !hasFetchedData && !hasError;
    const error = hasError ? fetchError.error : null;
    return { url, isLoading, error };
  }

  // Non-remote URL: return sync result, never loading, no error
  return { url: syncBlobUrl, isLoading: false, error: null };
}
