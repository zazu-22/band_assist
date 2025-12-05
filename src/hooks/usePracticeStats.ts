import { useState, useEffect, useCallback } from 'react';
import type { PracticeStats } from '../types';
import { supabaseStorageService } from '../services/supabaseStorageService';

interface UsePracticeStatsResult {
  stats: PracticeStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch aggregate practice statistics
 *
 * Fetches aggregate practice statistics including total sessions, minutes,
 * song progress counts, and recent sessions. Supports optional date range
 * filtering. Automatically refetches when userId, bandId, or dateRange changes.
 * Returns null when userId or bandId is null.
 *
 * Note: dateRange object should be memoized in the calling component to avoid
 * unnecessary refetches on every render.
 *
 * @param userId - User ID to fetch stats for
 * @param bandId - Band ID to filter stats by
 * @param dateRange - Optional date range filter { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
 * @returns Practice stats, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * function PracticeOverview() {
 *   const dateRange = useMemo(() => ({ start: '2025-01-01', end: '2025-01-31' }), []);
 *   const { stats, isLoading, error, refetch } = usePracticeStats(
 *     user?.id || null,
 *     currentBandId,
 *     dateRange
 *   );
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <h2>Practice Stats</h2>
 *       <p>Total Sessions: {stats?.totalSessions || 0}</p>
 *       <p>Total Minutes: {stats?.totalMinutes || 0}</p>
 *       <p>Songs Learned: {stats?.songsLearned || 0}</p>
 *       <p>Songs Mastered: {stats?.songsMastered || 0}</p>
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePracticeStats(
  userId: string | null,
  bandId: string | null,
  dateRange?: { start: string; end: string }
): UsePracticeStatsResult {
  const [stats, setStats] = useState<PracticeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId || !bandId) {
      setStats(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await supabaseStorageService.calculatePracticeStats(
        userId,
        bandId,
        dateRange
      );
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load practice statistics'));
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, bandId, dateRange]);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, isLoading, error, refetch: load };
}
