import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePracticeStats } from '../usePracticeStats';
import { supabaseStorageService } from '../../services/supabaseStorageService';
import type { PracticeStats, PracticeSession } from '../../types';

// Mock the supabaseStorageService
vi.mock('../../services/supabaseStorageService', () => ({
  supabaseStorageService: {
    calculatePracticeStats: vi.fn(),
  },
}));

describe('usePracticeStats', () => {
  const mockUserId = 'user-123';
  const mockBandId = 'band-456';

  const mockRecentSessions: PracticeSession[] = [
    {
      id: 'session-1',
      userId: mockUserId,
      songId: 'song-1',
      bandId: mockBandId,
      durationMinutes: 30,
      date: '2025-12-01',
      createdAt: '2025-12-01T10:00:00Z',
      updatedAt: '2025-12-01T10:00:00Z',
    },
    {
      id: 'session-2',
      userId: mockUserId,
      songId: 'song-2',
      bandId: mockBandId,
      durationMinutes: 45,
      date: '2025-12-02',
      createdAt: '2025-12-02T11:00:00Z',
      updatedAt: '2025-12-02T11:00:00Z',
    },
  ];

  const mockStats: PracticeStats = {
    totalSessions: 10,
    totalMinutes: 420,
    averageSessionMinutes: 42,
    songsLearned: 3,
    songsMastered: 2,
    recentSessions: mockRecentSessions,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('null/undefined input handling', () => {
    it('should return null stats when userId is null', async () => {
      const { result } = renderHook(() =>
        usePracticeStats(null, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.stats).toBeNull();
      expect(result.current.error).toBeNull();
      expect(supabaseStorageService.calculatePracticeStats).not.toHaveBeenCalled();
    });

    it('should return null stats when bandId is null', async () => {
      const { result } = renderHook(() =>
        usePracticeStats(mockUserId, null)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.stats).toBeNull();
      expect(result.current.error).toBeNull();
      expect(supabaseStorageService.calculatePracticeStats).not.toHaveBeenCalled();
    });

    it('should return null stats when both userId and bandId are null', async () => {
      const { result } = renderHook(() => usePracticeStats(null, null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.stats).toBeNull();
      expect(result.current.error).toBeNull();
      expect(supabaseStorageService.calculatePracticeStats).not.toHaveBeenCalled();
    });
  });

  describe('loading state transitions', () => {
    it('should start with loading true and transition to false on success', async () => {
      vi.mocked(supabaseStorageService.calculatePracticeStats).mockResolvedValue(
        mockStats
      );

      const { result } = renderHook(() =>
        usePracticeStats(mockUserId, mockBandId)
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.stats).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.stats).toEqual(mockStats);
      expect(result.current.error).toBeNull();
    });

    it('should set loading false after error', async () => {
      const mockError = new Error('Failed to calculate stats');
      vi.mocked(supabaseStorageService.calculatePracticeStats).mockRejectedValue(
        mockError
      );

      const { result } = renderHook(() =>
        usePracticeStats(mockUserId, mockBandId)
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.stats).toBeNull();
    });
  });

  describe('successful data fetching', () => {
    it('should fetch stats on mount', async () => {
      vi.mocked(supabaseStorageService.calculatePracticeStats).mockResolvedValue(
        mockStats
      );

      const { result } = renderHook(() =>
        usePracticeStats(mockUserId, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.calculatePracticeStats).toHaveBeenCalledTimes(1);
      expect(supabaseStorageService.calculatePracticeStats).toHaveBeenCalledWith(
        mockUserId,
        mockBandId,
        undefined
      );
      expect(result.current.stats).toEqual(mockStats);
      expect(result.current.error).toBeNull();
    });

    it('should pass dateRange to service', async () => {
      vi.mocked(supabaseStorageService.calculatePracticeStats).mockResolvedValue(
        mockStats
      );

      const dateRange = {
        start: '2025-12-01',
        end: '2025-12-31',
      };

      const { result } = renderHook(() =>
        usePracticeStats(mockUserId, mockBandId, dateRange)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.calculatePracticeStats).toHaveBeenCalledWith(
        mockUserId,
        mockBandId,
        dateRange
      );
    });

    it('should handle stats with zero values', async () => {
      const emptyStats: PracticeStats = {
        totalSessions: 0,
        totalMinutes: 0,
        averageSessionMinutes: 0,
        songsLearned: 0,
        songsMastered: 0,
        recentSessions: [],
      };

      vi.mocked(supabaseStorageService.calculatePracticeStats).mockResolvedValue(
        emptyStats
      );

      const { result } = renderHook(() =>
        usePracticeStats(mockUserId, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.stats).toEqual(emptyStats);
      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', async () => {
      const mockError = new Error('Network error');
      vi.mocked(supabaseStorageService.calculatePracticeStats).mockRejectedValue(
        mockError
      );

      const { result } = renderHook(() =>
        usePracticeStats(mockUserId, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.stats).toBeNull();
    });

    it('should convert non-Error objects to Error', async () => {
      vi.mocked(supabaseStorageService.calculatePracticeStats).mockRejectedValue(
        'String error'
      );

      const { result } = renderHook(() =>
        usePracticeStats(mockUserId, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe(
        'Failed to load practice statistics'
      );
      expect(result.current.stats).toBeNull();
    });

    it('should clear previous error on successful refetch', async () => {
      const mockError = new Error('Network error');
      vi.mocked(supabaseStorageService.calculatePracticeStats)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockStats);

      const { result } = renderHook(() =>
        usePracticeStats(mockUserId, mockBandId)
      );

      // Wait for initial error
      await waitFor(() => {
        expect(result.current.error).toEqual(mockError);
      });

      // Refetch should clear error
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      expect(result.current.stats).toEqual(mockStats);
    });
  });

  describe('refetch functionality', () => {
    it('should refetch when refetch called', async () => {
      vi.mocked(supabaseStorageService.calculatePracticeStats).mockResolvedValue(
        mockStats
      );

      const { result } = renderHook(() =>
        usePracticeStats(mockUserId, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.calculatePracticeStats).toHaveBeenCalledTimes(1);

      await result.current.refetch();

      expect(supabaseStorageService.calculatePracticeStats).toHaveBeenCalledTimes(2);
    });

    it('should update stats on refetch', async () => {
      const initialStats: PracticeStats = {
        ...mockStats,
        totalSessions: 5,
      };

      const updatedStats: PracticeStats = {
        ...mockStats,
        totalSessions: 10,
      };

      vi.mocked(supabaseStorageService.calculatePracticeStats)
        .mockResolvedValueOnce(initialStats)
        .mockResolvedValueOnce(updatedStats);

      const { result } = renderHook(() =>
        usePracticeStats(mockUserId, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.stats?.totalSessions).toBe(5);
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.stats?.totalSessions).toBe(10);
      });
    });
  });

  describe('dateRange changes trigger refetch', () => {
    it('should refetch when dateRange changes', async () => {
      vi.mocked(supabaseStorageService.calculatePracticeStats).mockResolvedValue(
        mockStats
      );

      const initialDateRange = { start: '2025-12-01', end: '2025-12-31' };
      const { result, rerender } = renderHook(
        ({ dateRange }) => usePracticeStats(mockUserId, mockBandId, dateRange),
        { initialProps: { dateRange: initialDateRange } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.calculatePracticeStats).toHaveBeenCalledTimes(1);
      expect(supabaseStorageService.calculatePracticeStats).toHaveBeenCalledWith(
        mockUserId,
        mockBandId,
        initialDateRange
      );

      // Change dateRange
      const newDateRange = { start: '2025-11-01', end: '2025-11-30' };
      rerender({ dateRange: newDateRange });

      await waitFor(() => {
        expect(supabaseStorageService.calculatePracticeStats).toHaveBeenCalledTimes(2);
      });

      expect(supabaseStorageService.calculatePracticeStats).toHaveBeenLastCalledWith(
        mockUserId,
        mockBandId,
        newDateRange
      );
    });

    it('should refetch when dateRange is added', async () => {
      vi.mocked(supabaseStorageService.calculatePracticeStats).mockResolvedValue(
        mockStats
      );

      const { result, rerender } = renderHook(
        ({ dateRange }) => usePracticeStats(mockUserId, mockBandId, dateRange),
        { initialProps: { dateRange: undefined as { start: string; end: string } | undefined } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.calculatePracticeStats).toHaveBeenCalledTimes(1);
      expect(supabaseStorageService.calculatePracticeStats).toHaveBeenCalledWith(
        mockUserId,
        mockBandId,
        undefined
      );

      // Add dateRange
      const newDateRange = { start: '2025-12-01', end: '2025-12-31' };
      rerender({ dateRange: newDateRange });

      await waitFor(() => {
        expect(supabaseStorageService.calculatePracticeStats).toHaveBeenCalledTimes(2);
      });

      expect(supabaseStorageService.calculatePracticeStats).toHaveBeenLastCalledWith(
        mockUserId,
        mockBandId,
        newDateRange
      );
    });

    it('should refetch when dateRange is removed', async () => {
      vi.mocked(supabaseStorageService.calculatePracticeStats).mockResolvedValue(
        mockStats
      );

      const initialDateRange = { start: '2025-12-01', end: '2025-12-31' };
      const { result, rerender } = renderHook(
        ({ dateRange }) => usePracticeStats(mockUserId, mockBandId, dateRange),
        { initialProps: { dateRange: initialDateRange as { start: string; end: string } | undefined } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.calculatePracticeStats).toHaveBeenCalledTimes(1);

      // Remove dateRange
      rerender({ dateRange: undefined });

      await waitFor(() => {
        expect(supabaseStorageService.calculatePracticeStats).toHaveBeenCalledTimes(2);
      });

      expect(supabaseStorageService.calculatePracticeStats).toHaveBeenLastCalledWith(
        mockUserId,
        mockBandId,
        undefined
      );
    });
  });

  describe('parameter changes trigger refetch', () => {
    it('should refetch when userId changes', async () => {
      vi.mocked(supabaseStorageService.calculatePracticeStats).mockResolvedValue(
        mockStats
      );

      const { result, rerender } = renderHook(
        ({ userId }) => usePracticeStats(userId, mockBandId),
        { initialProps: { userId: mockUserId } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.calculatePracticeStats).toHaveBeenCalledTimes(1);

      // Change userId
      const newUserId = 'user-999';
      rerender({ userId: newUserId });

      await waitFor(() => {
        expect(supabaseStorageService.calculatePracticeStats).toHaveBeenCalledTimes(2);
      });

      expect(supabaseStorageService.calculatePracticeStats).toHaveBeenLastCalledWith(
        newUserId,
        mockBandId,
        undefined
      );
    });

    it('should refetch when bandId changes', async () => {
      vi.mocked(supabaseStorageService.calculatePracticeStats).mockResolvedValue(
        mockStats
      );

      const { result, rerender } = renderHook(
        ({ bandId }) => usePracticeStats(mockUserId, bandId),
        { initialProps: { bandId: mockBandId } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.calculatePracticeStats).toHaveBeenCalledTimes(1);

      // Change bandId
      const newBandId = 'band-999';
      rerender({ bandId: newBandId });

      await waitFor(() => {
        expect(supabaseStorageService.calculatePracticeStats).toHaveBeenCalledTimes(2);
      });

      expect(supabaseStorageService.calculatePracticeStats).toHaveBeenLastCalledWith(
        mockUserId,
        newBandId,
        undefined
      );
    });

    it('should transition from null to valid userId', async () => {
      vi.mocked(supabaseStorageService.calculatePracticeStats).mockResolvedValue(
        mockStats
      );

      const { result, rerender } = renderHook(
        ({ userId }) => usePracticeStats(userId, mockBandId),
        { initialProps: { userId: null as string | null } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.stats).toBeNull();
      expect(supabaseStorageService.calculatePracticeStats).not.toHaveBeenCalled();

      // Change to valid userId
      rerender({ userId: mockUserId });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.calculatePracticeStats).toHaveBeenCalledTimes(1);
      expect(result.current.stats).toEqual(mockStats);
    });

    it('should transition from valid userId to null', async () => {
      vi.mocked(supabaseStorageService.calculatePracticeStats).mockResolvedValue(
        mockStats
      );

      const { result, rerender } = renderHook(
        ({ userId }) => usePracticeStats(userId, mockBandId),
        { initialProps: { userId: mockUserId as string | null } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.stats).toEqual(mockStats);

      // Change to null userId
      rerender({ userId: null });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.stats).toBeNull();
    });
  });
});
