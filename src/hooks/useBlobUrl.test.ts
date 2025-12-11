import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useBlobUrl } from './useBlobUrl';

describe('useBlobUrl', () => {
  // Store original URL methods
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  // Mock instances for assertions
  let createObjectURLMock: MockInstance;
  let revokeObjectURLMock: MockInstance;
  let urlCounter = 0;

  beforeEach(() => {
    urlCounter = 0;
    createObjectURLMock = vi.fn(() => `blob:test-url-${++urlCounter}`);
    revokeObjectURLMock = vi.fn();
    URL.createObjectURL = createObjectURLMock as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURLMock as unknown as typeof URL.revokeObjectURL;
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.clearAllMocks();
  });

  // Valid base64 audio data (minimal MP3 header bytes)
  const validAudioDataUri =
    'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYNf+ZHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

  describe('valid data URI conversion', () => {
    it('should convert valid audio data URI to blob URL', () => {
      const { result } = renderHook(() => useBlobUrl(validAudioDataUri));

      expect(result.current.url).toBe('blob:test-url-1');
      expect(result.current.isLoading).toBe(false);
      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      expect(createObjectURLMock).toHaveBeenCalledWith(expect.any(Blob));
    });

    it('should extract correct MIME type from data URI', () => {
      renderHook(() => useBlobUrl(validAudioDataUri));

      const createdBlob = createObjectURLMock.mock.calls[0][0] as Blob;
      expect(createdBlob.type).toBe('audio/mp3');
    });

    it('should handle different audio MIME types', () => {
      const wavDataUri =
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';
      const { result } = renderHook(() => useBlobUrl(wavDataUri));

      expect(result.current.url).toBe('blob:test-url-1');
      const createdBlob = createObjectURLMock.mock.calls[0][0] as Blob;
      expect(createdBlob.type).toBe('audio/wav');
    });

    it('should work with custom prefix', () => {
      const imageDataUri =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const { result } = renderHook(() => useBlobUrl(imageDataUri, 'data:image'));

      expect(result.current.url).toBe('blob:test-url-1');
      const createdBlob = createObjectURLMock.mock.calls[0][0] as Blob;
      expect(createdBlob.type).toBe('image/png');
    });
  });

  describe('invalid/malformed input handling', () => {
    it('should return undefined for undefined input', () => {
      const { result } = renderHook(() => useBlobUrl(undefined));

      expect(result.current.url).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(createObjectURLMock).not.toHaveBeenCalled();
    });

    it('should return undefined for empty string', () => {
      const { result } = renderHook(() => useBlobUrl(''));

      expect(result.current.url).toBeUndefined();
      expect(createObjectURLMock).not.toHaveBeenCalled();
    });

    it('should return undefined for non-matching prefix', () => {
      const { result } = renderHook(() => useBlobUrl(validAudioDataUri, 'data:video'));

      expect(result.current.url).toBeUndefined();
      expect(createObjectURLMock).not.toHaveBeenCalled();
    });

    it('should return undefined for malformed data URI (missing base64 marker)', () => {
      const malformedUri = 'data:audio/mp3;notbase64,somedata';
      const { result } = renderHook(() => useBlobUrl(malformedUri));

      expect(result.current.url).toBeUndefined();
      expect(createObjectURLMock).not.toHaveBeenCalled();
    });

    it('should return undefined for data URI without comma separator', () => {
      const malformedUri = 'data:audio/mp3;base64';
      const { result } = renderHook(() => useBlobUrl(malformedUri));

      expect(result.current.url).toBeUndefined();
    });

    it('should handle invalid base64 gracefully', () => {
      // Invalid base64 that will cause atob to throw
      const invalidBase64Uri = 'data:audio/mp3;base64,!!!invalid!!!';
      const { result } = renderHook(() => useBlobUrl(invalidBase64Uri));

      expect(result.current.url).toBeUndefined();
    });

    it('should pass through existing blob URLs', () => {
      const blobUrl = 'blob:http://localhost/abc-123';
      const { result: blobResult } = renderHook(() => useBlobUrl(blobUrl));
      expect(blobResult.current.url).toBe(blobUrl);

      expect(createObjectURLMock).not.toHaveBeenCalled();
    });

    it('should return undefined url and isLoading true for remote URLs initially', () => {
      // Remote URLs are fetched asynchronously
      const httpsUrl = 'https://example.com/audio.mp3';
      const { result: httpsResult } = renderHook(() => useBlobUrl(httpsUrl));
      expect(httpsResult.current.url).toBeUndefined();
      expect(httpsResult.current.isLoading).toBe(true);

      const httpUrl = 'http://example.com/audio.mp3';
      const { result: httpResult } = renderHook(() => useBlobUrl(httpUrl));
      expect(httpResult.current.url).toBeUndefined();
      expect(httpResult.current.isLoading).toBe(true);
    });
  });

  describe('URL revocation on unmount', () => {
    it('should revoke URL when component unmounts', () => {
      const { unmount } = renderHook(() => useBlobUrl(validAudioDataUri));

      expect(revokeObjectURLMock).not.toHaveBeenCalled();

      unmount();

      expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:test-url-1');
    });

    it('should not attempt to revoke if no URL was created', () => {
      const { unmount } = renderHook(() => useBlobUrl(undefined));

      unmount();

      expect(revokeObjectURLMock).not.toHaveBeenCalled();
    });

    it('should not revoke passed-through blob URLs', () => {
      const { unmount } = renderHook(() => useBlobUrl('blob:http://localhost/abc-123'));
      unmount();
      expect(revokeObjectURLMock).not.toHaveBeenCalled();
    });
  });

  describe('URL revocation on dataUri changes', () => {
    it('should revoke old URL and create new one when dataUri changes', () => {
      const { rerender } = renderHook(({ dataUri }) => useBlobUrl(dataUri), {
        initialProps: { dataUri: validAudioDataUri },
      });

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLMock).not.toHaveBeenCalled();

      // Create a different valid data URI
      const newDataUri =
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';
      rerender({ dataUri: newDataUri });

      // Old URL should be revoked, new one created
      expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:test-url-1');
      expect(createObjectURLMock).toHaveBeenCalledTimes(2);
    });

    it('should revoke URL when dataUri changes to undefined', () => {
      const { result, rerender } = renderHook(({ dataUri }) => useBlobUrl(dataUri), {
        initialProps: { dataUri: validAudioDataUri as string | undefined },
      });

      expect(result.current.url).toBe('blob:test-url-1');

      rerender({ dataUri: undefined });

      expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
      expect(result.current.url).toBeUndefined();
    });

    it('should create URL when dataUri changes from undefined to valid', () => {
      const { result, rerender } = renderHook(({ dataUri }) => useBlobUrl(dataUri), {
        initialProps: { dataUri: undefined as string | undefined },
      });

      expect(result.current.url).toBeUndefined();
      expect(createObjectURLMock).not.toHaveBeenCalled();

      rerender({ dataUri: validAudioDataUri });

      expect(result.current.url).toBe('blob:test-url-1');
      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    });

    it('should not create new URL if dataUri is the same', () => {
      const { rerender } = renderHook(({ dataUri }) => useBlobUrl(dataUri), {
        initialProps: { dataUri: validAudioDataUri },
      });

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);

      // Rerender with same value
      rerender({ dataUri: validAudioDataUri });

      // Should not create a new URL
      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLMock).not.toHaveBeenCalled();
    });
  });

  describe('prefix parameter', () => {
    it('should use default prefix of data:audio', () => {
      const { result } = renderHook(() => useBlobUrl(validAudioDataUri));
      expect(result.current.url).toBe('blob:test-url-1');
    });

    it('should respect custom prefix parameter', () => {
      // Use a simple valid base64 for video type
      const videoDataUri = 'data:video/mp4;base64,SGVsbG8='; // "Hello" in base64
      const { result } = renderHook(() => useBlobUrl(videoDataUri, 'data:video'));

      expect(result.current.url).toBe('blob:test-url-1');
    });

    it('should update when prefix parameter changes', () => {
      const dataUri = 'data:audio/mp3;base64,SUQzBAA=';
      const { result, rerender } = renderHook(({ prefix }) => useBlobUrl(dataUri, prefix), {
        initialProps: { prefix: 'data:audio' },
      });

      expect(result.current.url).toBe('blob:test-url-1');

      // Change prefix to non-matching
      rerender({ prefix: 'data:video' });

      expect(revokeObjectURLMock).toHaveBeenCalled();
      expect(result.current.url).toBeUndefined();
    });
  });

  describe('blob content verification', () => {
    it('should create blob with correct binary content', () => {
      // Simple base64 that decodes to known bytes
      const simpleDataUri = 'data:audio/test;base64,SGVsbG8='; // "Hello" in base64
      renderHook(() => useBlobUrl(simpleDataUri));

      const createdBlob = createObjectURLMock.mock.calls[0][0] as Blob;
      expect(createdBlob).toBeInstanceOf(Blob);
      expect(createdBlob.size).toBe(5); // "Hello" is 5 bytes
    });
  });

  describe('remote URL fetching', () => {
    const originalFetch = global.fetch;
    let fetchMock: MockInstance;
    let abortSignal: AbortSignal | null = null;

    beforeEach(() => {
      abortSignal = null;
      fetchMock = vi.fn((url: string, options?: RequestInit) => {
        // Capture the abort signal for testing
        if (options?.signal) {
          abortSignal = options.signal;
        }
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['audio data'], { type: 'audio/mp3' })),
        });
      }) as unknown as MockInstance;
      global.fetch = fetchMock as unknown as typeof fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should fetch remote URL and return blob URL on success', async () => {
      const remoteUrl = 'https://example.com/audio.mp3';
      const { result } = renderHook(() => useBlobUrl(remoteUrl));

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.url).toBeUndefined();
      expect(result.current.error).toBeNull();

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.url).toBe('blob:test-url-1');
      expect(result.current.error).toBeNull();
      expect(fetchMock).toHaveBeenCalledWith(remoteUrl, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    });

    it('should set error state when fetch fails with HTTP error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        blob: () => Promise.resolve(new Blob()),
      });

      const remoteUrl = 'https://example.com/missing-audio.mp3';
      const { result } = renderHook(() => useBlobUrl(remoteUrl));

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();

      // Wait for error state
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.url).toBeUndefined();
      expect(result.current.error?.message).toContain('404');
    });

    it('should set error state when fetch throws network error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const remoteUrl = 'https://example.com/audio.mp3';
      const { result } = renderHook(() => useBlobUrl(remoteUrl));

      // Wait for error state
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.url).toBeUndefined();
      expect(result.current.error?.message).toBe('Network error');
    });

    it('should abort fetch on unmount', async () => {
      const remoteUrl = 'https://example.com/audio.mp3';

      // Create a promise that never resolves to simulate slow fetch
      fetchMock.mockImplementationOnce((_url: string, options?: RequestInit) => {
        if (options?.signal) {
          abortSignal = options.signal;
        }
        // Return a promise that never resolves - simulates a slow fetch
        return new Promise(() => {
          // Intentionally empty - we only care about testing abort behavior
        });
      });

      const { result, unmount } = renderHook(() => useBlobUrl(remoteUrl));

      expect(result.current.isLoading).toBe(true);

      // Unmount while still loading
      act(() => {
        unmount();
      });

      // Verify abort signal was triggered
      expect(abortSignal?.aborted).toBe(true);
    });

    it('should abort previous fetch when URL changes', async () => {
      const abortSignals: AbortSignal[] = [];

      fetchMock.mockImplementation((_url: string, options?: RequestInit) => {
        if (options?.signal) {
          abortSignals.push(options.signal);
          abortSignal = options.signal;
        }
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['audio data'], { type: 'audio/mp3' })),
        });
      });

      const { result, rerender } = renderHook(
        ({ url }) => useBlobUrl(url),
        { initialProps: { url: 'https://example.com/audio1.mp3' } }
      );

      expect(result.current.isLoading).toBe(true);

      // Change URL before first fetch completes
      rerender({ url: 'https://example.com/audio2.mp3' });

      // First request should be aborted (first signal in the array)
      expect(abortSignals[0]?.aborted).toBe(true);

      // Wait for second fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.url).toBeDefined();
    });

    it('should not set error state for abort errors', async () => {
      const abortError = new DOMException('Aborted', 'AbortError');
      fetchMock.mockRejectedValueOnce(abortError);

      const remoteUrl = 'https://example.com/audio.mp3';
      const { result, unmount } = renderHook(() => useBlobUrl(remoteUrl));

      // Unmount to trigger abort
      unmount();

      // Error should not be set for AbortError
      expect(result.current.error).toBeNull();
    });

    it('should clear error when starting a new fetch', async () => {
      // First fetch fails
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        blob: () => Promise.resolve(new Blob()),
      });

      const { result, rerender } = renderHook(
        ({ url }) => useBlobUrl(url),
        { initialProps: { url: 'https://example.com/bad-audio.mp3' } }
      );

      // Wait for error state
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Setup successful fetch for new URL
      fetchMock.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['audio data'], { type: 'audio/mp3' })),
      });

      // Change to different URL
      rerender({ url: 'https://example.com/good-audio.mp3' });

      // Error should be cleared and loading should be true
      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.isLoading).toBe(true);
      });

      // Wait for successful fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.url).toBeDefined();
      expect(result.current.error).toBeNull();
    });

    it('should return error: null for base64 data URIs', () => {
      const { result } = renderHook(() => useBlobUrl(validAudioDataUri));
      expect(result.current.error).toBeNull();
    });

    it('should return error: null for undefined input', () => {
      const { result } = renderHook(() => useBlobUrl(undefined));
      expect(result.current.error).toBeNull();
    });
  });
});
