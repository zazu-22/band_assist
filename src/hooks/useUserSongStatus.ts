import { useState, useEffect, useCallback } from 'react';
import type { UserSongProgress, UserSongStatus } from '../types';
import { supabaseStorageService } from '../services/supabaseStorageService';

interface UseUserSongStatusResult {
  status: UserSongProgress | null;
  isLoading: boolean;
  error: Error | null;
  updateStatus: (status: UserSongStatus, confidence?: number) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage a user's song learning status
 *
 * Fetches the learning status for a single song and provides optimistic updates.
 * When updateStatus is called, the UI updates immediately, and reverts on error.
 * Automatically refetches when userId or songId changes.
 * Returns null when userId or songId is null.
 *
 * @param userId - User ID to fetch status for
 * @param songId - Song ID to fetch status for
 * @returns Song status, loading state, error, update function, and refetch function
 *
 * @example
 * ```tsx
 * function SongProgress() {
 *   const { status, isLoading, error, updateStatus } = useUserSongStatus(
 *     user?.id || null,
 *     song.id
 *   );
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       Current: {status?.status || 'Not Started'}
 *       <button onClick={() => updateStatus('Learning', 3)}>
 *         Mark as Learning
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserSongStatus(
  userId: string | null,
  songId: string | null
): UseUserSongStatusResult {
  const [status, setStatus] = useState<UserSongProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId || !songId) {
      setStatus(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await supabaseStorageService.getUserSongStatus(userId, songId);
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load song status'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, songId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = useCallback(
    async (newStatus: UserSongStatus, confidence?: number) => {
      if (!userId || !songId) return;

      // Optimistic update
      const previousStatus = status;
      const now = new Date().toISOString();
      setStatus(prev =>
        prev
          ? { ...prev, status: newStatus, confidenceLevel: confidence }
          : {
              // Create optimistic placeholder for first-time status
              id: 'optimistic-' + Date.now(),
              userId,
              songId,
              status: newStatus,
              confidenceLevel: confidence,
              createdAt: now,
              updatedAt: now,
            }
      );

      try {
        const updated = await supabaseStorageService.updateUserSongStatus(
          userId,
          songId,
          newStatus,
          confidence
        );
        setStatus(updated);
        setError(null);
      } catch (err) {
        // Revert optimistic update on error
        setStatus(previousStatus);
        setError(err instanceof Error ? err : new Error('Failed to update song status'));
        throw err; // Re-throw so caller can handle
      }
    },
    [userId, songId, status]
  );

  return { status, isLoading, error, updateStatus, refetch: load };
}

// Hook for getting all song statuses in a band
interface UseAllUserSongStatusesResult {
  statuses: Map<string, UserSongProgress>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch all song statuses for a user in a band
 *
 * Fetches learning statuses for all songs in a band and returns them as a Map
 * keyed by songId for efficient O(1) lookups. Automatically refetches when
 * userId or bandId changes. Returns empty Map when userId or bandId is null.
 *
 * @param userId - User ID to fetch statuses for
 * @param bandId - Band ID to fetch statuses for
 * @returns Map of statuses keyed by songId, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * function SongList() {
 *   const { statuses, isLoading, error } = useAllUserSongStatuses(
 *     user?.id || null,
 *     currentBandId
 *   );
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {songs.map(song => {
 *         const songStatus = statuses.get(song.id);
 *         return (
 *           <div key={song.id}>
 *             {song.title} - {songStatus?.status || 'Not Started'}
 *           </div>
 *         );
 *       })}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAllUserSongStatuses(
  userId: string | null,
  bandId: string | null
): UseAllUserSongStatusesResult {
  const [statuses, setStatuses] = useState<Map<string, UserSongProgress>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId || !bandId) {
      setStatuses(new Map());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await supabaseStorageService.getAllUserSongStatuses(userId, bandId);
      setStatuses(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load song statuses'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, bandId]);

  useEffect(() => {
    load();
  }, [load]);

  return { statuses, isLoading, error, refetch: load };
}
