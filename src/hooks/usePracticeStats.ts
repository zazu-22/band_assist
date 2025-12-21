import { useState, useEffect, useCallback } from 'react';
import type { PracticeStats } from '../types';
import { supabaseStorageService } from '../services/supabaseStorageService';

/** Section-level practice statistics */
export interface SectionPracticeStats {
  totalMinutes: number;
  sessionCount: number;
}

interface UsePracticeStatsResult {
  stats: PracticeStats | null;
  /** Map of sectionId to section-level stats */
  sectionStats: Map<string, SectionPracticeStats>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UsePracticeStatsOptions {
  /** Filter stats to a specific song */
  songId?: string;
}

/**
 * Custom hook to fetch aggregate practice statistics
 *
 * Fetches aggregate practice statistics including total sessions, minutes,
 * song progress counts, recent sessions, and section-level statistics.
 * Supports optional date range filtering and song filtering.
 * Automatically refetches when userId, bandId, options, or dateRange changes.
 * Returns null when userId or bandId is null.
 *
 * Note: dateRange and options objects should be memoized in the calling component
 * to avoid unnecessary refetches on every render.
 *
 * @param userId - User ID to fetch stats for
 * @param bandId - Band ID to filter stats by
 * @param dateRange - Optional date range filter { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
 * @param options - Optional options like songId filter
 * @returns Practice stats, section stats, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * function PracticeOverview() {
 *   const dateRange = useMemo(() => ({ start: '2025-01-01', end: '2025-01-31' }), []);
 *   const { stats, sectionStats, isLoading, error, refetch } = usePracticeStats(
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
 *       <p>Section stats: {sectionStats.size} sections tracked</p>
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePracticeStats(
  userId: string | null,
  bandId: string | null,
  dateRange?: { start: string; end: string },
  options?: UsePracticeStatsOptions
): UsePracticeStatsResult {
  const [stats, setStats] = useState<PracticeStats | null>(null);
  const [sectionStats, setSectionStats] = useState<Map<string, SectionPracticeStats>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId || !bandId) {
      setStats(null);
      setSectionStats(new Map());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch main stats
      const data = await supabaseStorageService.calculatePracticeStats(
        userId,
        bandId,
        dateRange
      );
      setStats(data);

      // Fetch section-level stats
      const sectionData = await supabaseStorageService.calculateSectionPracticeStats(
        userId,
        bandId,
        options?.songId,
        dateRange
      );
      setSectionStats(sectionData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load practice statistics'));
      setStats(null);
      setSectionStats(new Map());
    } finally {
      setIsLoading(false);
    }
  }, [userId, bandId, dateRange, options?.songId]);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, sectionStats, isLoading, error, refetch: load };
}
