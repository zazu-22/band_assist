import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SectionPracticeStat, PracticeSession, SongSection } from '../types';
import { supabaseStorageService } from '../services/supabaseStorageService';

interface UseSectionPracticeStatsResult {
  stats: SectionPracticeStat[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and calculate practice statistics per section for a song.
 *
 * Aggregates data from practice sessions that have section_ids set,
 * calculating session count, total minutes, and last practiced date per section.
 *
 * @param songId - The song ID to get stats for, or null if no song selected
 * @param bandId - The band ID for context, or null if no band selected
 * @param userId - The user ID to scope stats to, or null if not authenticated
 * @param sections - The song sections to aggregate stats for
 * @returns Stats per section, loading state, error, and refetch function
 */
export function useSectionPracticeStats(
  songId: string | null,
  bandId: string | null,
  userId: string | null,
  sections: SongSection[]
): UseSectionPracticeStatsResult {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!songId || !bandId || !userId) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch all practice sessions for this song by the user
      const data = await supabaseStorageService.getPracticeSessions(
        userId,
        bandId,
        { songId }
      );
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load practice sessions'));
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [songId, bandId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Aggregate stats from sessions
  const stats = useMemo<SectionPracticeStat[]>(() => {
    if (sections.length === 0) return [];

    // Create accumulator for each section
    const statsMap = new Map<string, {
      sessionCount: number;
      totalMinutes: number;
      lastPracticedAt: string | null;
    }>();

    // Initialize all sections
    sections.forEach(section => {
      statsMap.set(section.id, {
        sessionCount: 0,
        totalMinutes: 0,
        lastPracticedAt: null,
      });
    });

    // Aggregate from sessions with section_ids
    sessions.forEach(session => {
      if (!session.sectionIds || session.sectionIds.length === 0) return;

      // Distribute duration across all practiced sections
      const durationPerSection = session.durationMinutes / session.sectionIds.length;

      session.sectionIds.forEach(sectionId => {
        const stat = statsMap.get(sectionId);
        if (!stat) return; // Section might have been deleted

        stat.sessionCount += 1;
        stat.totalMinutes += durationPerSection;

        // Track most recent practice date
        if (!stat.lastPracticedAt || session.date > stat.lastPracticedAt) {
          stat.lastPracticedAt = session.date;
        }
      });
    });

    // Convert to array with section names
    return sections.map(section => {
      const stat = statsMap.get(section.id)!;
      return {
        sectionId: section.id,
        sectionName: section.name,
        sessionCount: stat.sessionCount,
        totalMinutes: Math.round(stat.totalMinutes),
        lastPracticedAt: stat.lastPracticedAt,
      };
    });
  }, [sessions, sections]);

  return {
    stats,
    isLoading,
    error,
    refetch: load,
  };
}
