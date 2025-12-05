import { useState, useEffect, useCallback } from 'react';
import type { PracticeSession, PracticeFilters } from '../types';
import { supabaseStorageService } from '../services/supabaseStorageService';

interface UsePracticeSessionsResult {
  sessions: PracticeSession[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage practice sessions
 *
 * Fetches practice sessions for a user in a band with optional filtering.
 * Automatically refetches when userId, bandId, or filters change.
 * Returns empty sessions when userId or bandId is null.
 *
 * Note: filters object should be memoized in the calling component to avoid
 * unnecessary refetches on every render.
 *
 * @param userId - User ID to fetch sessions for
 * @param bandId - Band ID to filter sessions by
 * @param filters - Optional filters (songId, date range, limit)
 * @returns Practice sessions, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * function PracticeLog() {
 *   const filters = useMemo(() => ({ limit: 10, startDate: '2025-01-01' }), []);
 *   const { sessions, isLoading, error, refetch } = usePracticeSessions(
 *     user?.id || null,
 *     currentBandId,
 *     filters
 *   );
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {sessions.map(session => (
 *         <div key={session.id}>{session.durationMinutes} mins</div>
 *       ))}
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePracticeSessions(
  userId: string | null,
  bandId: string | null,
  filters?: PracticeFilters
): UsePracticeSessionsResult {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId || !bandId) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await supabaseStorageService.getPracticeSessions(
        userId,
        bandId,
        filters
      );
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load practice sessions'));
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, bandId, filters]);

  useEffect(() => {
    load();
  }, [load]);

  return { sessions, isLoading, error, refetch: load };
}
