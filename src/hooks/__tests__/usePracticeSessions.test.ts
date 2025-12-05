import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePracticeSessions } from '../usePracticeSessions';
import { supabaseStorageService } from '../../services/supabaseStorageService';
import type { PracticeSession, PracticeFilters } from '../../types';

// Mock the supabaseStorageService
vi.mock('../../services/supabaseStorageService', () => ({
  supabaseStorageService: {
    getPracticeSessions: vi.fn(),
  },
}));

describe('usePracticeSessions', () => {
  const mockUserId = 'user-123';
  const mockBandId = 'band-456';

  const mockSessions: PracticeSession[] = [
    {
      id: 'session-1',
      userId: mockUserId,
      songId: 'song-1',
      bandId: mockBandId,
      durationMinutes: 30,
      tempoBpm: 120,
      sectionsPracticed: ['Intro', 'Chorus'],
      notes: 'Good progress on chorus',
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('null/undefined input handling', () => {
    it('should return empty sessions when userId is null', async () => {
      const { result } = renderHook(() =>
        usePracticeSessions(null, mockBandId)
      );

      // Should complete loading immediately without calling service
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessions).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(supabaseStorageService.getPracticeSessions).not.toHaveBeenCalled();
    });

    it('should return empty sessions when bandId is null', async () => {
      const { result } = renderHook(() =>
        usePracticeSessions(mockUserId, null)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessions).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(supabaseStorageService.getPracticeSessions).not.toHaveBeenCalled();
    });

    it('should return empty sessions when both userId and bandId are null', async () => {
      const { result } = renderHook(() => usePracticeSessions(null, null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessions).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(supabaseStorageService.getPracticeSessions).not.toHaveBeenCalled();
    });
  });

  describe('loading state transitions', () => {
    it('should start with loading true and transition to false on success', async () => {
      vi.mocked(supabaseStorageService.getPracticeSessions).mockResolvedValue(
        mockSessions
      );

      const { result } = renderHook(() =>
        usePracticeSessions(mockUserId, mockBandId)
      );

      // Initial loading state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.sessions).toEqual([]);

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessions).toEqual(mockSessions);
      expect(result.current.error).toBeNull();
    });

    it('should set loading false after error', async () => {
      const mockError = new Error('Failed to fetch sessions');
      vi.mocked(supabaseStorageService.getPracticeSessions).mockRejectedValue(
        mockError
      );

      const { result } = renderHook(() =>
        usePracticeSessions(mockUserId, mockBandId)
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.sessions).toEqual([]);
    });
  });

  describe('successful data fetching', () => {
    it('should fetch sessions on mount', async () => {
      vi.mocked(supabaseStorageService.getPracticeSessions).mockResolvedValue(
        mockSessions
      );

      const { result } = renderHook(() =>
        usePracticeSessions(mockUserId, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.getPracticeSessions).toHaveBeenCalledTimes(1);
      expect(supabaseStorageService.getPracticeSessions).toHaveBeenCalledWith(
        mockUserId,
        mockBandId,
        undefined
      );
      expect(result.current.sessions).toEqual(mockSessions);
      expect(result.current.error).toBeNull();
    });

    it('should pass filters to service', async () => {
      vi.mocked(supabaseStorageService.getPracticeSessions).mockResolvedValue(
        mockSessions
      );

      const filters: PracticeFilters = {
        songId: 'song-1',
        startDate: '2025-12-01',
        endDate: '2025-12-31',
        limit: 10,
      };

      const { result } = renderHook(() =>
        usePracticeSessions(mockUserId, mockBandId, filters)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.getPracticeSessions).toHaveBeenCalledWith(
        mockUserId,
        mockBandId,
        filters
      );
    });

    it('should return empty array when service returns empty array', async () => {
      vi.mocked(supabaseStorageService.getPracticeSessions).mockResolvedValue([]);

      const { result } = renderHook(() =>
        usePracticeSessions(mockUserId, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessions).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should set error on fetch failure', async () => {
      const mockError = new Error('Network error');
      vi.mocked(supabaseStorageService.getPracticeSessions).mockRejectedValue(
        mockError
      );

      const { result } = renderHook(() =>
        usePracticeSessions(mockUserId, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.sessions).toEqual([]);
    });

    it('should convert non-Error objects to Error', async () => {
      vi.mocked(supabaseStorageService.getPracticeSessions).mockRejectedValue(
        'String error'
      );

      const { result } = renderHook(() =>
        usePracticeSessions(mockUserId, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to load practice sessions');
      expect(result.current.sessions).toEqual([]);
    });

    it('should clear previous error on successful refetch', async () => {
      const mockError = new Error('Network error');
      vi.mocked(supabaseStorageService.getPracticeSessions)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockSessions);

      const { result } = renderHook(() =>
        usePracticeSessions(mockUserId, mockBandId)
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

      expect(result.current.sessions).toEqual(mockSessions);
    });
  });

  describe('refetch functionality', () => {
    it('should refetch when refetch called', async () => {
      vi.mocked(supabaseStorageService.getPracticeSessions).mockResolvedValue(
        mockSessions
      );

      const { result } = renderHook(() =>
        usePracticeSessions(mockUserId, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.getPracticeSessions).toHaveBeenCalledTimes(1);

      // Call refetch
      await result.current.refetch();

      expect(supabaseStorageService.getPracticeSessions).toHaveBeenCalledTimes(2);
    });

    it('should update data on refetch', async () => {
      const initialSessions = [mockSessions[0]];
      const updatedSessions = mockSessions;

      vi.mocked(supabaseStorageService.getPracticeSessions)
        .mockResolvedValueOnce(initialSessions)
        .mockResolvedValueOnce(updatedSessions);

      const { result } = renderHook(() =>
        usePracticeSessions(mockUserId, mockBandId)
      );

      await waitFor(() => {
        expect(result.current.sessions).toEqual(initialSessions);
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.sessions).toEqual(updatedSessions);
      });
    });
  });

  describe('filter changes trigger refetch', () => {
    it('should refetch when filters change', async () => {
      vi.mocked(supabaseStorageService.getPracticeSessions).mockResolvedValue(
        mockSessions
      );

      const initialFilters: PracticeFilters = { songId: 'song-1' };
      const { result, rerender } = renderHook(
        ({ filters }) => usePracticeSessions(mockUserId, mockBandId, filters),
        { initialProps: { filters: initialFilters } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.getPracticeSessions).toHaveBeenCalledTimes(1);
      expect(supabaseStorageService.getPracticeSessions).toHaveBeenCalledWith(
        mockUserId,
        mockBandId,
        initialFilters
      );

      // Change filters
      const newFilters: PracticeFilters = { songId: 'song-2' };
      rerender({ filters: newFilters });

      await waitFor(() => {
        expect(supabaseStorageService.getPracticeSessions).toHaveBeenCalledTimes(2);
      });

      expect(supabaseStorageService.getPracticeSessions).toHaveBeenLastCalledWith(
        mockUserId,
        mockBandId,
        newFilters
      );
    });

    it('should refetch when userId changes', async () => {
      vi.mocked(supabaseStorageService.getPracticeSessions).mockResolvedValue(
        mockSessions
      );

      const { result, rerender } = renderHook(
        ({ userId }) => usePracticeSessions(userId, mockBandId),
        { initialProps: { userId: mockUserId } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.getPracticeSessions).toHaveBeenCalledTimes(1);

      // Change userId
      const newUserId = 'user-999';
      rerender({ userId: newUserId });

      await waitFor(() => {
        expect(supabaseStorageService.getPracticeSessions).toHaveBeenCalledTimes(2);
      });

      expect(supabaseStorageService.getPracticeSessions).toHaveBeenLastCalledWith(
        newUserId,
        mockBandId,
        undefined
      );
    });

    it('should refetch when bandId changes', async () => {
      vi.mocked(supabaseStorageService.getPracticeSessions).mockResolvedValue(
        mockSessions
      );

      const { result, rerender } = renderHook(
        ({ bandId }) => usePracticeSessions(mockUserId, bandId),
        { initialProps: { bandId: mockBandId } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseStorageService.getPracticeSessions).toHaveBeenCalledTimes(1);

      // Change bandId
      const newBandId = 'band-999';
      rerender({ bandId: newBandId });

      await waitFor(() => {
        expect(supabaseStorageService.getPracticeSessions).toHaveBeenCalledTimes(2);
      });

      expect(supabaseStorageService.getPracticeSessions).toHaveBeenLastCalledWith(
        mockUserId,
        newBandId,
        undefined
      );
    });
  });
});
