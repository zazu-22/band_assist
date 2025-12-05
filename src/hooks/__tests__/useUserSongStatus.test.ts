import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useUserSongStatus,
  useAllUserSongStatuses,
} from '../useUserSongStatus';
import { supabaseStorageService } from '../../services/supabaseStorageService';
import type { UserSongProgress } from '../../types';

// Mock the supabaseStorageService
vi.mock('../../services/supabaseStorageService', () => ({
  supabaseStorageService: {
    getUserSongStatus: vi.fn(),
    updateUserSongStatus: vi.fn(),
    getAllUserSongStatuses: vi.fn(),
  },
}));

describe('useUserSongStatus', () => {
  const mockUserId = 'user-123';
  const mockSongId = 'song-456';

  const mockStatus: UserSongProgress = {
    id: 'progress-1',
    userId: mockUserId,
    songId: mockSongId,
    status: 'Learning',
    confidenceLevel: 3,
    lastPracticedAt: '2025-12-01T10:00:00Z',
    createdAt: '2025-11-01T10:00:00Z',
    updatedAt: '2025-12-01T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('null/undefined input handling', () => {
    it('should return null when userId is null', async () => {
      const { result } = renderHook(() =>
        useUserSongStatus(null, mockSongId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBeNull();
      expect(result.current.error).toBeNull();
      expect(supabaseStorageService.getUserSongStatus).not.toHaveBeenCalled();
    });

    it('should return null when songId is null', async () => {
      const { result } = renderHook(() =>
        useUserSongStatus(mockUserId, null)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBeNull();
      expect(result.current.error).toBeNull();
      expect(supabaseStorageService.getUserSongStatus).not.toHaveBeenCalled();
    });

    it('should return null when both userId and songId are null', async () => {
      const { result } = renderHook(() => useUserSongStatus(null, null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBeNull();
      expect(result.current.error).toBeNull();
      expect(supabaseStorageService.getUserSongStatus).not.toHaveBeenCalled();
    });
  });

  describe('loading state transitions', () => {
    it('should start with loading true and transition to false on success', async () => {
      vi.mocked(supabaseStorageService.getUserSongStatus).mockResolvedValue(
        mockStatus
      );

      const { result } = renderHook(() =>
        useUserSongStatus(mockUserId, mockSongId)
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.status).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toEqual(mockStatus);
      expect(result.current.error).toBeNull();
    });

    it('should set loading false after error', async () => {
      const mockError = new Error('Failed to fetch status');
      vi.mocked(supabaseStorageService.getUserSongStatus).mockRejectedValue(
        mockError
      );

      const { result } = renderHook(() =>
        useUserSongStatus(mockUserId, mockSongId)
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('successful data fetching', () => {
    it('should fetch status on mount', async () => {
      vi.mocked(supabaseStorageService.getUserSongStatus).mockResolvedValue(
        mockStatus
      );

      const { result } = renderHook(() =>
        useUserSongStatus(mockUserId, mockSongId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.getUserSongStatus).toHaveBeenCalledTimes(1);
      expect(supabaseStorageService.getUserSongStatus).toHaveBeenCalledWith(
        mockUserId,
        mockSongId
      );
      expect(result.current.status).toEqual(mockStatus);
      expect(result.current.error).toBeNull();
    });

    it('should handle null status from service', async () => {
      vi.mocked(supabaseStorageService.getUserSongStatus).mockResolvedValue(null);

      const { result } = renderHook(() =>
        useUserSongStatus(mockUserId, mockSongId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should set error on fetch failure', async () => {
      const mockError = new Error('Network error');
      vi.mocked(supabaseStorageService.getUserSongStatus).mockRejectedValue(
        mockError
      );

      const { result } = renderHook(() =>
        useUserSongStatus(mockUserId, mockSongId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should convert non-Error objects to Error', async () => {
      vi.mocked(supabaseStorageService.getUserSongStatus).mockRejectedValue(
        'String error'
      );

      const { result } = renderHook(() =>
        useUserSongStatus(mockUserId, mockSongId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to load song status');
    });
  });

  describe('refetch functionality', () => {
    it('should refetch when refetch called', async () => {
      vi.mocked(supabaseStorageService.getUserSongStatus).mockResolvedValue(
        mockStatus
      );

      const { result } = renderHook(() =>
        useUserSongStatus(mockUserId, mockSongId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.getUserSongStatus).toHaveBeenCalledTimes(1);

      await result.current.refetch();

      expect(supabaseStorageService.getUserSongStatus).toHaveBeenCalledTimes(2);
    });

    it('should clear error on successful refetch', async () => {
      const mockError = new Error('Network error');
      vi.mocked(supabaseStorageService.getUserSongStatus)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockStatus);

      const { result } = renderHook(() =>
        useUserSongStatus(mockUserId, mockSongId)
      );

      await waitFor(() => {
        expect(result.current.error).toEqual(mockError);
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      expect(result.current.status).toEqual(mockStatus);
    });
  });

  describe('updateStatus with optimistic updates', () => {
    it('should perform optimistic update on updateStatus', async () => {
      vi.mocked(supabaseStorageService.getUserSongStatus).mockResolvedValue(
        mockStatus
      );

      const updatedStatus: UserSongProgress = {
        ...mockStatus,
        status: 'Mastered',
        confidenceLevel: 5,
      };

      vi.mocked(supabaseStorageService.updateUserSongStatus).mockResolvedValue(
        updatedStatus
      );

      const { result } = renderHook(() =>
        useUserSongStatus(mockUserId, mockSongId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toEqual(mockStatus);

      // Perform update
      await act(async () => {
        await result.current.updateStatus('Mastered', 5);
      });

      // Should have server response now
      expect(result.current.status?.status).toBe('Mastered');
      expect(result.current.status?.confidenceLevel).toBe(5);
      expect(result.current.error).toBeNull();
    });

    it('should revert optimistic update on error', async () => {
      vi.mocked(supabaseStorageService.getUserSongStatus).mockResolvedValue(
        mockStatus
      );

      const updateError = new Error('Update failed');
      vi.mocked(supabaseStorageService.updateUserSongStatus).mockRejectedValue(
        updateError
      );

      const { result } = renderHook(() =>
        useUserSongStatus(mockUserId, mockSongId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const originalStatus = result.current.status;

      // Attempt update that will fail
      let thrownError: Error | undefined;
      await act(async () => {
        try {
          await result.current.updateStatus('Mastered', 5);
        } catch (err) {
          thrownError = err as Error;
        }
      });

      // Should revert to original status
      expect(result.current.status).toEqual(originalStatus);
      expect(result.current.error).toEqual(updateError);
      expect(thrownError).toEqual(updateError);
    });

    it('should handle updateStatus when status is null', async () => {
      vi.mocked(supabaseStorageService.getUserSongStatus).mockResolvedValue(null);

      const newStatus: UserSongProgress = {
        id: 'new-progress-1',
        userId: mockUserId,
        songId: mockSongId,
        status: 'Learning',
        confidenceLevel: 2,
        createdAt: '2025-12-05T10:00:00Z',
        updatedAt: '2025-12-05T10:00:00Z',
      };

      vi.mocked(supabaseStorageService.updateUserSongStatus).mockResolvedValue(
        newStatus
      );

      const { result } = renderHook(() =>
        useUserSongStatus(mockUserId, mockSongId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBeNull();

      // Update should still work
      await act(async () => {
        await result.current.updateStatus('Learning', 2);
      });

      expect(result.current.status).toEqual(newStatus);
    });

    it('should not call service when userId is null', async () => {
      const { result } = renderHook(() =>
        useUserSongStatus(null, mockSongId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateStatus('Learning', 3);
      });

      expect(supabaseStorageService.updateUserSongStatus).not.toHaveBeenCalled();
    });

    it('should not call service when songId is null', async () => {
      const { result } = renderHook(() =>
        useUserSongStatus(mockUserId, null)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateStatus('Learning', 3);
      });

      expect(supabaseStorageService.updateUserSongStatus).not.toHaveBeenCalled();
    });

    it('should update with status only (no confidence)', async () => {
      vi.mocked(supabaseStorageService.getUserSongStatus).mockResolvedValue(
        mockStatus
      );

      const updatedStatus: UserSongProgress = {
        ...mockStatus,
        status: 'Learned',
      };

      vi.mocked(supabaseStorageService.updateUserSongStatus).mockResolvedValue(
        updatedStatus
      );

      const { result } = renderHook(() =>
        useUserSongStatus(mockUserId, mockSongId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateStatus('Learned');
      });

      expect(supabaseStorageService.updateUserSongStatus).toHaveBeenCalledWith(
        mockUserId,
        mockSongId,
        'Learned',
        undefined
      );
    });
  });

  describe('parameter changes trigger refetch', () => {
    it('should refetch when userId changes', async () => {
      vi.mocked(supabaseStorageService.getUserSongStatus).mockResolvedValue(
        mockStatus
      );

      const { result, rerender } = renderHook(
        ({ userId }) => useUserSongStatus(userId, mockSongId),
        { initialProps: { userId: mockUserId } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.getUserSongStatus).toHaveBeenCalledTimes(1);

      const newUserId = 'user-999';
      rerender({ userId: newUserId });

      await waitFor(() => {
        expect(supabaseStorageService.getUserSongStatus).toHaveBeenCalledTimes(2);
      });

      expect(supabaseStorageService.getUserSongStatus).toHaveBeenLastCalledWith(
        newUserId,
        mockSongId
      );
    });

    it('should refetch when songId changes', async () => {
      vi.mocked(supabaseStorageService.getUserSongStatus).mockResolvedValue(
        mockStatus
      );

      const { result, rerender } = renderHook(
        ({ songId }) => useUserSongStatus(mockUserId, songId),
        { initialProps: { songId: mockSongId } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.getUserSongStatus).toHaveBeenCalledTimes(1);

      const newSongId = 'song-999';
      rerender({ songId: newSongId });

      await waitFor(() => {
        expect(supabaseStorageService.getUserSongStatus).toHaveBeenCalledTimes(2);
      });

      expect(supabaseStorageService.getUserSongStatus).toHaveBeenLastCalledWith(
        mockUserId,
        newSongId
      );
    });
  });
});

describe('useAllUserSongStatuses', () => {
  const mockUserId = 'user-123';
  const mockBandId = 'band-456';

  const mockStatuses: Map<string, UserSongProgress> = new Map([
    [
      'song-1',
      {
        id: 'progress-1',
        userId: mockUserId,
        songId: 'song-1',
        status: 'Learning',
        confidenceLevel: 3,
        createdAt: '2025-11-01T10:00:00Z',
        updatedAt: '2025-12-01T10:00:00Z',
      },
    ],
    [
      'song-2',
      {
        id: 'progress-2',
        userId: mockUserId,
        songId: 'song-2',
        status: 'Mastered',
        confidenceLevel: 5,
        createdAt: '2025-10-01T10:00:00Z',
        updatedAt: '2025-11-15T10:00:00Z',
      },
    ],
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('null/undefined input handling', () => {
    it('should return empty Map when userId is null', async () => {
      const { result } = renderHook(() =>
        useAllUserSongStatuses(null, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.statuses).toBeInstanceOf(Map);
      expect(result.current.statuses.size).toBe(0);
      expect(result.current.error).toBeNull();
      expect(supabaseStorageService.getAllUserSongStatuses).not.toHaveBeenCalled();
    });

    it('should return empty Map when bandId is null', async () => {
      const { result } = renderHook(() =>
        useAllUserSongStatuses(mockUserId, null)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.statuses).toBeInstanceOf(Map);
      expect(result.current.statuses.size).toBe(0);
      expect(result.current.error).toBeNull();
      expect(supabaseStorageService.getAllUserSongStatuses).not.toHaveBeenCalled();
    });

    it('should return empty Map when both userId and bandId are null', async () => {
      const { result } = renderHook(() => useAllUserSongStatuses(null, null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.statuses).toBeInstanceOf(Map);
      expect(result.current.statuses.size).toBe(0);
      expect(result.current.error).toBeNull();
      expect(supabaseStorageService.getAllUserSongStatuses).not.toHaveBeenCalled();
    });
  });

  describe('successful data fetching', () => {
    it('should return Map keyed by songId', async () => {
      vi.mocked(supabaseStorageService.getAllUserSongStatuses).mockResolvedValue(
        mockStatuses
      );

      const { result } = renderHook(() =>
        useAllUserSongStatuses(mockUserId, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.getAllUserSongStatuses).toHaveBeenCalledTimes(1);
      expect(supabaseStorageService.getAllUserSongStatuses).toHaveBeenCalledWith(
        mockUserId,
        mockBandId
      );
      expect(result.current.statuses).toBeInstanceOf(Map);
      expect(result.current.statuses.size).toBe(2);
      expect(result.current.statuses.get('song-1')?.status).toBe('Learning');
      expect(result.current.statuses.get('song-2')?.status).toBe('Mastered');
      expect(result.current.error).toBeNull();
    });

    it('should return empty Map when service returns empty Map', async () => {
      vi.mocked(supabaseStorageService.getAllUserSongStatuses).mockResolvedValue(
        new Map()
      );

      const { result } = renderHook(() =>
        useAllUserSongStatuses(mockUserId, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.statuses).toBeInstanceOf(Map);
      expect(result.current.statuses.size).toBe(0);
      expect(result.current.error).toBeNull();
    });
  });

  describe('loading state transitions', () => {
    it('should start with loading true and transition to false on success', async () => {
      vi.mocked(supabaseStorageService.getAllUserSongStatuses).mockResolvedValue(
        mockStatuses
      );

      const { result } = renderHook(() =>
        useAllUserSongStatuses(mockUserId, mockBandId)
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.statuses.size).toBe(0);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.statuses.size).toBe(2);
    });

    it('should set loading false after error', async () => {
      const mockError = new Error('Failed to fetch statuses');
      vi.mocked(supabaseStorageService.getAllUserSongStatuses).mockRejectedValue(
        mockError
      );

      const { result } = renderHook(() =>
        useAllUserSongStatuses(mockUserId, mockBandId)
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('error handling', () => {
    it('should set error on fetch failure', async () => {
      const mockError = new Error('Network error');
      vi.mocked(supabaseStorageService.getAllUserSongStatuses).mockRejectedValue(
        mockError
      );

      const { result } = renderHook(() =>
        useAllUserSongStatuses(mockUserId, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should convert non-Error objects to Error', async () => {
      vi.mocked(supabaseStorageService.getAllUserSongStatuses).mockRejectedValue(
        'String error'
      );

      const { result } = renderHook(() =>
        useAllUserSongStatuses(mockUserId, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to load song statuses');
    });
  });

  describe('refetch functionality', () => {
    it('should refetch when refetch called', async () => {
      vi.mocked(supabaseStorageService.getAllUserSongStatuses).mockResolvedValue(
        mockStatuses
      );

      const { result } = renderHook(() =>
        useAllUserSongStatuses(mockUserId, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.getAllUserSongStatuses).toHaveBeenCalledTimes(1);

      await result.current.refetch();

      expect(supabaseStorageService.getAllUserSongStatuses).toHaveBeenCalledTimes(2);
    });
  });

  describe('parameter changes trigger refetch', () => {
    it('should refetch when userId changes', async () => {
      vi.mocked(supabaseStorageService.getAllUserSongStatuses).mockResolvedValue(
        mockStatuses
      );

      const { result, rerender } = renderHook(
        ({ userId }) => useAllUserSongStatuses(userId, mockBandId),
        { initialProps: { userId: mockUserId } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.getAllUserSongStatuses).toHaveBeenCalledTimes(1);

      const newUserId = 'user-999';
      rerender({ userId: newUserId });

      await waitFor(() => {
        expect(supabaseStorageService.getAllUserSongStatuses).toHaveBeenCalledTimes(2);
      });

      expect(supabaseStorageService.getAllUserSongStatuses).toHaveBeenLastCalledWith(
        newUserId,
        mockBandId
      );
    });

    it('should refetch when bandId changes', async () => {
      vi.mocked(supabaseStorageService.getAllUserSongStatuses).mockResolvedValue(
        mockStatuses
      );

      const { result, rerender } = renderHook(
        ({ bandId }) => useAllUserSongStatuses(mockUserId, bandId),
        { initialProps: { bandId: mockBandId } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.getAllUserSongStatuses).toHaveBeenCalledTimes(1);

      const newBandId = 'band-999';
      rerender({ bandId: newBandId });

      await waitFor(() => {
        expect(supabaseStorageService.getAllUserSongStatuses).toHaveBeenCalledTimes(2);
      });

      expect(supabaseStorageService.getAllUserSongStatuses).toHaveBeenLastCalledWith(
        mockUserId,
        newBandId
      );
    });
  });
});
