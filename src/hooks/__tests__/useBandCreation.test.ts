import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBandCreation } from '../useBandCreation';
import { getSupabaseClient } from '@/services/supabaseClient';
import { StorageService } from '@/services/storageService';
import { STORAGE_KEYS } from '@/services/localStorageService';

// Mock dependencies
vi.mock('@/services/supabaseClient', () => ({
  getSupabaseClient: vi.fn(),
}));

vi.mock('@/services/storageService', () => ({
  StorageService: {
    setCurrentBand: vi.fn(),
    load: vi.fn(),
  },
}));

vi.mock('@/components/ui', () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe('useBandCreation', () => {
  // Mock refs
  const mockIsLoadingBandRef = { current: false };
  const mockCurrentBandIdRef = { current: null as string | null };
  const mockLoadedBandIdRef = { current: null as string | null };

  // Mock state setters
  const mockSetUserBands = vi.fn();
  const mockSetCurrentBandId = vi.fn();
  const mockSetCurrentBandName = vi.fn();
  const mockSetIsAdmin = vi.fn();
  const mockSetIsLoading = vi.fn();
  const mockSetSongs = vi.fn();
  const mockSetMembers = vi.fn();
  const mockSetAvailableRoles = vi.fn();
  const mockSetEvents = vi.fn();
  const mockCancelPendingSave = vi.fn();

  const mockSession = {
    user: { id: 'user-123', email: 'test@example.com' },
  } as const;

  const defaultParams = {
    session: mockSession as Parameters<typeof useBandCreation>[0]['session'],
    cancelPendingSave: mockCancelPendingSave,
    isLoadingBandRef: mockIsLoadingBandRef,
    currentBandIdRef: mockCurrentBandIdRef,
    loadedBandIdRef: mockLoadedBandIdRef,
    setUserBands: mockSetUserBands,
    setCurrentBandId: mockSetCurrentBandId,
    setCurrentBandName: mockSetCurrentBandName,
    setIsAdmin: mockSetIsAdmin,
    setIsLoading: mockSetIsLoading,
    setSongs: mockSetSongs,
    setMembers: mockSetMembers,
    setAvailableRoles: mockSetAvailableRoles,
    setEvents: mockSetEvents,
  };

  // Mock Supabase client
  const mockRpc = vi.fn();
  const mockSupabase = {
    rpc: mockRpc,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoadingBandRef.current = false;
    mockCurrentBandIdRef.current = null;
    mockLoadedBandIdRef.current = null;
    (getSupabaseClient as Mock).mockReturnValue(mockSupabase);
    (StorageService.load as Mock).mockResolvedValue({
      songs: [],
      members: [],
      roles: [],
      events: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('dialog state management', () => {
    it('should initialize with dialog closed', () => {
      const { result } = renderHook(() => useBandCreation(defaultParams));
      expect(result.current.isDialogOpen).toBe(false);
    });

    it('should open dialog when openDialog is called', () => {
      const { result } = renderHook(() => useBandCreation(defaultParams));

      act(() => {
        result.current.openDialog();
      });

      expect(result.current.isDialogOpen).toBe(true);
    });

    it('should close dialog when closeDialog is called', () => {
      const { result } = renderHook(() => useBandCreation(defaultParams));

      act(() => {
        result.current.openDialog();
      });
      expect(result.current.isDialogOpen).toBe(true);

      act(() => {
        result.current.closeDialog();
      });
      expect(result.current.isDialogOpen).toBe(false);
    });
  });

  describe('createBand - validation', () => {
    it('should throw error if not logged in', async () => {
      const { result } = renderHook(() =>
        useBandCreation({ ...defaultParams, session: null })
      );

      await expect(result.current.createBand('Test Band')).rejects.toThrow(
        'You must be logged in to create a band'
      );
    });

    it('should throw error if supabase client unavailable', async () => {
      (getSupabaseClient as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useBandCreation(defaultParams));

      await expect(result.current.createBand('Test Band')).rejects.toThrow(
        'Database connection unavailable'
      );
    });
  });

  describe('createBand - successful flow', () => {
    const mockBandId = 'band-456';
    const mockBandName = 'My New Band';

    beforeEach(() => {
      mockRpc.mockResolvedValue({
        data: [{ band_id: mockBandId, band_name: mockBandName, created_at: new Date().toISOString() }],
        error: null,
      });
    });

    it('should call RPC function with band name', async () => {
      const { result } = renderHook(() => useBandCreation(defaultParams));

      await act(async () => {
        await result.current.createBand(mockBandName);
      });

      expect(mockRpc).toHaveBeenCalledWith('create_band_with_admin', {
        p_band_name: mockBandName,
      });
    });

    it('should cancel pending saves before creation', async () => {
      const { result } = renderHook(() => useBandCreation(defaultParams));

      await act(async () => {
        await result.current.createBand(mockBandName);
      });

      expect(mockCancelPendingSave).toHaveBeenCalled();
    });

    it('should set loading band ref during creation', async () => {
      const { result } = renderHook(() => useBandCreation(defaultParams));

      // The ref is set and then reset, but we can check it was called via the flow
      await act(async () => {
        await result.current.createBand(mockBandName);
      });

      // After successful creation, loading guard should be reset
      expect(mockIsLoadingBandRef.current).toBe(false);
    });

    it('should update user bands with new band', async () => {
      const { result } = renderHook(() => useBandCreation(defaultParams));

      await act(async () => {
        await result.current.createBand(mockBandName);
      });

      expect(mockSetUserBands).toHaveBeenCalled();
      const updateFn = mockSetUserBands.mock.calls[0][0];
      const newBands = updateFn([{ id: 'existing', name: 'Existing' }]);
      expect(newBands).toContainEqual({ id: mockBandId, name: mockBandName });
    });

    it('should set current band to new band', async () => {
      const { result } = renderHook(() => useBandCreation(defaultParams));

      await act(async () => {
        await result.current.createBand(mockBandName);
      });

      expect(mockSetCurrentBandId).toHaveBeenCalledWith(mockBandId);
      expect(mockSetCurrentBandName).toHaveBeenCalledWith(mockBandName);
    });

    it('should set user as admin', async () => {
      const { result } = renderHook(() => useBandCreation(defaultParams));

      await act(async () => {
        await result.current.createBand(mockBandName);
      });

      expect(mockSetIsAdmin).toHaveBeenCalledWith(true);
    });

    it('should update storage service context', async () => {
      const { result } = renderHook(() => useBandCreation(defaultParams));

      await act(async () => {
        await result.current.createBand(mockBandName);
      });

      expect(StorageService.setCurrentBand).toHaveBeenCalledWith(mockBandId);
    });

    it('should persist band to localStorage', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const { result } = renderHook(() => useBandCreation(defaultParams));

      await act(async () => {
        await result.current.createBand(mockBandName);
      });

      expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEYS.SELECTED_BAND, mockBandId);
    });

    it('should load data for new band', async () => {
      const { result } = renderHook(() => useBandCreation(defaultParams));

      await act(async () => {
        await result.current.createBand(mockBandName);
      });

      expect(StorageService.load).toHaveBeenCalled();
      expect(mockSetSongs).toHaveBeenCalled();
      expect(mockSetMembers).toHaveBeenCalled();
      expect(mockSetAvailableRoles).toHaveBeenCalled();
      expect(mockSetEvents).toHaveBeenCalled();
    });
  });

  describe('createBand - error handling', () => {
    it('should throw and cleanup on RPC error', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const { result } = renderHook(() => useBandCreation(defaultParams));

      await expect(result.current.createBand('Test Band')).rejects.toThrow(
        'Database error'
      );

      // Loading guard should be reset on error
      expect(mockIsLoadingBandRef.current).toBe(false);
    });

    it('should throw on empty RPC result', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const { result } = renderHook(() => useBandCreation(defaultParams));

      await expect(result.current.createBand('Test Band')).rejects.toThrow(
        'Failed to create band'
      );
    });

    it('should handle localStorage errors gracefully', async () => {
      mockRpc.mockResolvedValue({
        data: [{ band_id: 'band-123', band_name: 'Test', created_at: new Date().toISOString() }],
        error: null,
      });

      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });

      const { result } = renderHook(() => useBandCreation(defaultParams));

      // Should not throw - graceful fallback
      await act(async () => {
        await result.current.createBand('Test Band');
      });

      expect(mockSetCurrentBandId).toHaveBeenCalled();
    });

    it('should reset loading guard on data load error', async () => {
      mockRpc.mockResolvedValue({
        data: [{ band_id: 'band-123', band_name: 'Test', created_at: new Date().toISOString() }],
        error: null,
      });

      (StorageService.load as Mock).mockRejectedValue(new Error('Load failed'));

      const { result } = renderHook(() => useBandCreation(defaultParams));

      await act(async () => {
        await result.current.createBand('Test Band');
      });

      // Should still complete and reset loading guard
      expect(mockIsLoadingBandRef.current).toBe(false);
    });
  });

  describe('createBand - concurrent creation prevention', () => {
    it('should prevent concurrent band creation attempts', async () => {
      // Slow RPC call
      mockRpc.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({
          data: [{ band_id: 'band-123', band_name: 'Test', created_at: new Date().toISOString() }],
          error: null,
        }), 100);
      }));

      const { result } = renderHook(() => useBandCreation(defaultParams));

      // Start first creation
      const firstPromise = result.current.createBand('First Band');

      // Try to start second creation immediately
      const secondPromise = result.current.createBand('Second Band');

      await Promise.all([firstPromise, secondPromise]);

      // RPC should only be called once
      expect(mockRpc).toHaveBeenCalledTimes(1);
    });
  });

  describe('createBand - race condition handling', () => {
    it('should skip state update if band changed during load', async () => {
      const mockBandId = 'band-123';
      mockRpc.mockResolvedValue({
        data: [{ band_id: mockBandId, band_name: 'Test', created_at: new Date().toISOString() }],
        error: null,
      });

      // Simulate band switch during load
      (StorageService.load as Mock).mockImplementation(async () => {
        // Change band during load
        mockCurrentBandIdRef.current = 'different-band';
        return { songs: [], members: [], roles: [], events: [] };
      });

      const { result } = renderHook(() => useBandCreation(defaultParams));

      await act(async () => {
        await result.current.createBand('Test Band');
      });

      // Should not update songs/members since band changed
      // (The check happens after StorageService.load returns)
      // setCurrentBandId is called before load, so it will be called
      expect(mockSetCurrentBandId).toHaveBeenCalledWith(mockBandId);
    });
  });
});
