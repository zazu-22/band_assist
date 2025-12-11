import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { renderHook } from '@testing-library/react';
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

      expect(result.current).toBe('blob:test-url-1');
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

      expect(result.current).toBe('blob:test-url-1');
      const createdBlob = createObjectURLMock.mock.calls[0][0] as Blob;
      expect(createdBlob.type).toBe('audio/wav');
    });

    it('should work with custom prefix', () => {
      const imageDataUri =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const { result } = renderHook(() => useBlobUrl(imageDataUri, 'data:image'));

      expect(result.current).toBe('blob:test-url-1');
      const createdBlob = createObjectURLMock.mock.calls[0][0] as Blob;
      expect(createdBlob.type).toBe('image/png');
    });
  });

  describe('invalid/malformed input handling', () => {
    it('should return undefined for undefined input', () => {
      const { result } = renderHook(() => useBlobUrl(undefined));

      expect(result.current).toBeUndefined();
      expect(createObjectURLMock).not.toHaveBeenCalled();
    });

    it('should return undefined for empty string', () => {
      const { result } = renderHook(() => useBlobUrl(''));

      expect(result.current).toBeUndefined();
      expect(createObjectURLMock).not.toHaveBeenCalled();
    });

    it('should return undefined for non-matching prefix', () => {
      const { result } = renderHook(() => useBlobUrl(validAudioDataUri, 'data:video'));

      expect(result.current).toBeUndefined();
      expect(createObjectURLMock).not.toHaveBeenCalled();
    });

    it('should return undefined for malformed data URI (missing base64 marker)', () => {
      const malformedUri = 'data:audio/mp3;notbase64,somedata';
      const { result } = renderHook(() => useBlobUrl(malformedUri));

      expect(result.current).toBeUndefined();
      expect(createObjectURLMock).not.toHaveBeenCalled();
    });

    it('should return undefined for data URI without comma separator', () => {
      const malformedUri = 'data:audio/mp3;base64';
      const { result } = renderHook(() => useBlobUrl(malformedUri));

      expect(result.current).toBeUndefined();
    });

    it('should handle invalid base64 gracefully', () => {
      // Invalid base64 that will cause atob to throw
      const invalidBase64Uri = 'data:audio/mp3;base64,!!!invalid!!!';
      const { result } = renderHook(() => useBlobUrl(invalidBase64Uri));

      expect(result.current).toBeUndefined();
    });

    it('should pass through existing blob URLs', () => {
      const blobUrl = 'blob:http://localhost/abc-123';
      const { result: blobResult } = renderHook(() => useBlobUrl(blobUrl));
      expect(blobResult.current).toBe(blobUrl);

      expect(createObjectURLMock).not.toHaveBeenCalled();
    });

    it('should return undefined initially for remote URLs (async fetch)', () => {
      // Remote URLs are fetched asynchronously, so initial value is undefined
      const httpsUrl = 'https://example.com/audio.mp3';
      const { result: httpsResult } = renderHook(() => useBlobUrl(httpsUrl));
      expect(httpsResult.current).toBeUndefined();

      const httpUrl = 'http://example.com/audio.mp3';
      const { result: httpResult } = renderHook(() => useBlobUrl(httpUrl));
      expect(httpResult.current).toBeUndefined();
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

      expect(result.current).toBe('blob:test-url-1');

      rerender({ dataUri: undefined });

      expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
      expect(result.current).toBeUndefined();
    });

    it('should create URL when dataUri changes from undefined to valid', () => {
      const { result, rerender } = renderHook(({ dataUri }) => useBlobUrl(dataUri), {
        initialProps: { dataUri: undefined as string | undefined },
      });

      expect(result.current).toBeUndefined();
      expect(createObjectURLMock).not.toHaveBeenCalled();

      rerender({ dataUri: validAudioDataUri });

      expect(result.current).toBe('blob:test-url-1');
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
      expect(result.current).toBe('blob:test-url-1');
    });

    it('should respect custom prefix parameter', () => {
      // Use a simple valid base64 for video type
      const videoDataUri = 'data:video/mp4;base64,SGVsbG8='; // "Hello" in base64
      const { result } = renderHook(() => useBlobUrl(videoDataUri, 'data:video'));

      expect(result.current).toBe('blob:test-url-1');
    });

    it('should update when prefix parameter changes', () => {
      const dataUri = 'data:audio/mp3;base64,SUQzBAA=';
      const { result, rerender } = renderHook(({ prefix }) => useBlobUrl(dataUri, prefix), {
        initialProps: { prefix: 'data:audio' },
      });

      expect(result.current).toBe('blob:test-url-1');

      // Change prefix to non-matching
      rerender({ prefix: 'data:video' });

      expect(revokeObjectURLMock).toHaveBeenCalled();
      expect(result.current).toBeUndefined();
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
});
