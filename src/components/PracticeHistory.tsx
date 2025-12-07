import React, { memo, useMemo, useState } from 'react';
import { CalendarDays, Clock, Target, Trophy, Music } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Label,
  Badge,
} from '@/components/primitives';
import { StatCard, LoadingSpinner, EmptyState } from '@/components/ui';
import { usePracticeSessions } from '@/hooks/usePracticeSessions';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { useAllUserSongStatuses } from '@/hooks/useUserSongStatus';
import type { Song, PracticeFilters, UserSongStatus } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

interface PracticeHistoryProps {
  songs: Song[];
  currentUserId: string | null;
  currentBandId: string | null;
}

type BadgeVariant = 'success' | 'info' | 'warning' | 'default';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert minutes to "Xh Ym" format
 * @example formatMinutesToHours(90) // "1h 30m"
 * @example formatMinutesToHours(45) // "45m"
 * @example formatMinutesToHours(120) // "2h 0m"
 */
function formatMinutesToHours(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Format YYYY-MM-DD to "Mon DD, YYYY"
 * @example formatDate("2025-12-05") // "Dec 05, 2025"
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00'); // Force local timezone
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

/**
 * Get date N days ago in YYYY-MM-DD format
 * @example getDateDaysAgo(30) // "2025-11-05" (if today is 2025-12-05)
 */
function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

/**
 * Get today's date in YYYY-MM-DD format
 * @example getTodayDate() // "2025-12-05"
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Map UserSongStatus to Badge variant
 */
function getStatusVariant(status: UserSongStatus | undefined): BadgeVariant {
  if (!status) return 'default';

  const variantMap: Record<UserSongStatus, BadgeVariant> = {
    'Mastered': 'success',
    'Learned': 'info',
    'Learning': 'warning',
    'Not Started': 'default',
  };

  return variantMap[status] || 'default';
}

// =============================================================================
// COMPONENT
// =============================================================================

export const PracticeHistory: React.FC<PracticeHistoryProps> = memo(function PracticeHistory({
  songs,
  currentUserId,
  currentBandId,
}) {
  // Date range state - default to last 30 days
  const [startDate, setStartDate] = useState(getDateDaysAgo(30));
  const [endDate, setEndDate] = useState(getTodayDate());
  const [selectedSongId, setSelectedSongId] = useState<string>('all');

  // Memoize filters to prevent unnecessary refetches
  const filters = useMemo<PracticeFilters>(
    () => ({
      songId: selectedSongId === 'all' ? undefined : selectedSongId,
      startDate,
      endDate,
    }),
    [selectedSongId, startDate, endDate]
  );

  const dateRange = useMemo(
    () => ({ start: startDate, end: endDate }),
    [startDate, endDate]
  );

  // Fetch data using hooks
  const { sessions, isLoading: sessionsLoading, error: sessionsError } = usePracticeSessions(
    currentUserId,
    currentBandId,
    filters
  );

  const { stats, isLoading: statsLoading, error: statsError } = usePracticeStats(
    currentUserId,
    currentBandId,
    dateRange
  );

  const { statuses, isLoading: statusesLoading } = useAllUserSongStatuses(
    currentUserId,
    currentBandId
  );

  // Create song lookup map
  const songMap = useMemo(() => {
    return new Map(songs.map(song => [song.id, song]));
  }, [songs]);

  // Combined loading state
  const isLoading = sessionsLoading || statsLoading || statusesLoading;
  const error = sessionsError || statsError;

  // Show link account message when not authenticated
  if (!currentUserId) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Practice History</h1>
          <p className="text-muted-foreground">
            Track your practice sessions and progress over time
          </p>
        </div>
        <EmptyState
          icon={Music}
          title="Link Your Account"
          description="Link your account to a band member to track your personal practice history and progress."
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Practice History</h1>
        <p className="text-muted-foreground">
          Track your practice sessions and progress over time
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" label="Loading practice history..." />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">
              Failed to load practice history: {error.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Sessions"
              value={stats?.totalSessions || 0}
              icon={CalendarDays}
              variant="info"
            />
            <StatCard
              title="Total Practice Time"
              value={formatMinutesToHours(stats?.totalMinutes || 0)}
              icon={Clock}
              variant="default"
            />
            <StatCard
              title="Songs Learned"
              value={stats?.songsLearned || 0}
              icon={Target}
              variant="warning"
            />
            <StatCard
              title="Songs Mastered"
              value={stats?.songsMastered || 0}
              icon={Trophy}
              variant="success"
            />
          </div>

          {/* Filters Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Song Filter */}
                <div className="space-y-2">
                  <Label htmlFor="song-filter">Song</Label>
                  <Select value={selectedSongId} onValueChange={setSelectedSongId}>
                    <SelectTrigger id="song-filter">
                      <SelectValue placeholder="All Songs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Songs</SelectItem>
                      {songs.map(song => (
                        <SelectItem key={song.id} value={song.id}>
                          {song.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sessions Table Card */}
          <Card>
            <CardHeader>
              <CardTitle>Practice Sessions</CardTitle>
              <CardDescription>
                {sessions.length} session{sessions.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <EmptyState
                  icon={Music}
                  title="No Practice Sessions"
                  description="No practice sessions found for the selected filters. Start practicing to see your history here!"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                          Song
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                          Duration
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground hidden sm:table-cell">
                          Tempo
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground hidden md:table-cell">
                          Sections
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground hidden lg:table-cell">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(session => {
                        const song = songMap.get(session.songId);
                        const songStatus = statuses.get(session.songId);

                        return (
                          <tr key={session.id} className="border-b border-border last:border-0">
                            <td className="py-3 px-4 text-sm text-foreground">
                              {formatDate(session.date)}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground font-medium">
                              {song?.title || 'Unknown Song'}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground">
                              {session.durationMinutes}m
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground hidden sm:table-cell">
                              {session.tempoBpm ? `${session.tempoBpm} BPM` : '—'}
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground hidden md:table-cell">
                              {session.sectionsPracticed && session.sectionsPracticed.length > 0
                                ? session.sectionsPracticed.join(', ')
                                : '—'}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={getStatusVariant(songStatus?.status)}>
                                {songStatus?.status || 'Not Started'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground hidden lg:table-cell max-w-xs truncate">
                              {session.notes || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
});

PracticeHistory.displayName = 'PracticeHistory';
