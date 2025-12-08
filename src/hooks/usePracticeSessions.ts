import { useState, useEffect, useCallback } from 'react';
import type { PracticeSession, PracticeFilters } from '../types';
import { supabaseStorageService } from '../services/supabaseStorageService';

/** Input data for logging a new practice session */
export interface LogPracticeSessionInput {
  songId: string;
  durationMinutes: number;
  tempoBpm?: number;
  sectionsPracticed?: string[];
  notes?: string;
  date: string;
}

/** Input data for updating an existing practice session */
export interface UpdatePracticeSessionInput {
  durationMinutes?: number;
  tempoBpm?: number;
  sectionsPracticed?: string[];
  notes?: string;
  date?: string;
  songId?: string;
}

interface UsePracticeSessionsResult {
  sessions: PracticeSession[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  logSession: (input: LogPracticeSessionInput) => Promise<PracticeSession>;
  updateSession: (sessionId: string, updates: UpdatePracticeSessionInput) => Promise<PracticeSession>;
  deleteSession: (sessionId: string) => Promise<void>;
}

/**
 * Manage and provide practice sessions for a user within a band.
 *
 * Automatically fetches sessions and refetches when `userId`, `bandId`, or `filters` change.
 *
 * @param userId - The user ID to scope fetched sessions, or `null` to indicate no user selected
 * @param bandId - The band ID to scope fetched sessions, or `null` to indicate no band selected
 * @param filters - Optional query filters (e.g., songId, date range, limit); memoize to avoid unnecessary refetches
 * @returns An object with `sessions`, `isLoading`, `error`, `refetch`, `logSession`, `updateSession`, and `deleteSession`
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

  const logSession = useCallback(
    async (input: LogPracticeSessionInput): Promise<PracticeSession> => {
      if (!userId || !bandId) {
        throw new Error('User and band must be selected to log a practice session');
      }

      const session = await supabaseStorageService.logPracticeSession({
        userId,
        bandId,
        ...input,
      });

      // Add to local state at the beginning (assuming date DESC sort by default)
      setSessions(prev => [session, ...prev]);

      return session;
    },
    [userId, bandId]
  );

  const updateSession = useCallback(
    async (sessionId: string, updates: UpdatePracticeSessionInput): Promise<PracticeSession> => {
      if (!userId || !bandId) {
        throw new Error('User and band must be selected to update a practice session');
      }

      const updated = await supabaseStorageService.updatePracticeSession(sessionId, updates);

      // Update local state
      setSessions(prev => prev.map(s => (s.id === sessionId ? updated : s)));

      return updated;
    },
    [userId, bandId]
  );

  const deleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      if (!userId || !bandId) {
        throw new Error('User and band must be selected to delete a practice session');
      }

      await supabaseStorageService.deletePracticeSession(sessionId);

      // Remove from local state
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    },
    [userId, bandId]
  );

  return {
    sessions,
    isLoading,
    error,
    refetch: load,
    logSession,
    updateSession,
    deleteSession,
  };
}