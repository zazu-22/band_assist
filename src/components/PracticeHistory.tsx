import React, { memo, useMemo, useState, useCallback } from 'react';
import {
  CalendarDays,
  Clock,
  Target,
  Trophy,
  Music,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  MoreHorizontal,
  Filter,
  X,
} from 'lucide-react';
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
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/primitives';
import {
  StatCard,
  LoadingSpinner,
  EmptyState,
  LogPracticeModal,
  ConfirmDialog,
  toast,
} from '@/components/ui';
import type { PracticeFormData } from '@/components/ui';
import { usePracticeSessions } from '@/hooks/usePracticeSessions';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { useAllUserSongStatuses } from '@/hooks/useUserSongStatus';
import { supabaseStorageService } from '@/services/supabaseStorageService';
import { getTodayDateString, getDateDaysAgo } from '@/lib/dateUtils';
import type { Song, PracticeFilters, UserSongStatus, PracticeSortField, SortDirection, PracticeSession } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

interface PracticeHistoryProps {
  songs: Song[];
  currentUserId: string | null;
  currentBandId: string | null;
}

type BadgeVariant = 'success' | 'info' | 'warning' | 'default';

// Status filter options including 'all'
type StatusFilterValue = UserSongStatus | 'all';
const STATUS_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Not Started', label: 'Not Started' },
  { value: 'Learning', label: 'Learning' },
  { value: 'Learned', label: 'Learned' },
  { value: 'Mastered', label: 'Mastered' },
];

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

// Default filter values
const DEFAULT_FILTERS = {
  songId: 'all' as string,
  status: 'all' as StatusFilterValue,
  startDate: getDateDaysAgo(30),
  endDate: getTodayDateString(),
};

export const PracticeHistory: React.FC<PracticeHistoryProps> = memo(function PracticeHistory({
  songs,
  currentUserId,
  currentBandId,
}) {
  // Staged filter state (UI edits these)
  const [stagedSongId, setStagedSongId] = useState<string>(DEFAULT_FILTERS.songId);
  const [stagedStatus, setStagedStatus] = useState<StatusFilterValue>(DEFAULT_FILTERS.status);
  const [stagedStartDate, setStagedStartDate] = useState(DEFAULT_FILTERS.startDate);
  const [stagedEndDate, setStagedEndDate] = useState(DEFAULT_FILTERS.endDate);

  // Applied filter state (used for actual queries)
  const [appliedSongId, setAppliedSongId] = useState<string>(DEFAULT_FILTERS.songId);
  const [appliedStatus, setAppliedStatus] = useState<StatusFilterValue>(DEFAULT_FILTERS.status);
  const [appliedStartDate, setAppliedStartDate] = useState(DEFAULT_FILTERS.startDate);
  const [appliedEndDate, setAppliedEndDate] = useState(DEFAULT_FILTERS.endDate);

  // Sort state (applies immediately, not staged)
  const [sortBy, setSortBy] = useState<PracticeSortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Modal state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<PracticeSession | undefined>();

  // Delete confirmation state
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  // Memoize filters to prevent unnecessary refetches (uses applied state)
  const filters = useMemo<PracticeFilters>(
    () => ({
      songId: appliedSongId === 'all' ? undefined : appliedSongId,
      startDate: appliedStartDate,
      endDate: appliedEndDate,
      sortBy,
      sortDirection,
    }),
    [appliedSongId, appliedStartDate, appliedEndDate, sortBy, sortDirection]
  );

  const dateRange = useMemo(
    () => ({ start: appliedStartDate, end: appliedEndDate }),
    [appliedStartDate, appliedEndDate]
  );

  // Check if staged filters differ from applied filters
  const hasUnappliedChanges = useMemo(() => {
    return (
      stagedSongId !== appliedSongId ||
      stagedStatus !== appliedStatus ||
      stagedStartDate !== appliedStartDate ||
      stagedEndDate !== appliedEndDate
    );
  }, [stagedSongId, appliedSongId, stagedStatus, appliedStatus, stagedStartDate, appliedStartDate, stagedEndDate, appliedEndDate]);

  // Check if filters are at default values
  const isDefaultFilters = useMemo(() => {
    return (
      appliedSongId === DEFAULT_FILTERS.songId &&
      appliedStatus === DEFAULT_FILTERS.status &&
      appliedStartDate === DEFAULT_FILTERS.startDate &&
      appliedEndDate === DEFAULT_FILTERS.endDate
    );
  }, [appliedSongId, appliedStatus, appliedStartDate, appliedEndDate]);

  // Fetch data using hooks
  const {
    sessions,
    isLoading: sessionsLoading,
    error: sessionsError,
    logSession,
    updateSession,
    deleteSession,
  } = usePracticeSessions(currentUserId, currentBandId, filters);

  const { stats, isLoading: statsLoading, error: statsError } = usePracticeStats(
    currentUserId,
    currentBandId,
    dateRange
  );

  const { statuses, isLoading: statusesLoading, refetch: refetchStatuses } = useAllUserSongStatuses(
    currentUserId,
    currentBandId
  );

  // Create song lookup map
  const songMap = useMemo(() => {
    return new Map(songs.map(song => [song.id, song]));
  }, [songs]);

  // Apply client-side status filter (uses applied status)
  // Status is per-song (from user_song_status), so we filter sessions by their song's status
  const filteredSessions = useMemo(() => {
    if (appliedStatus === 'all') {
      return sessions;
    }
    return sessions.filter(session => {
      const songStatus = statuses.get(session.songId);
      // If no status exists, treat as 'Not Started'
      const effectiveStatus = songStatus?.status || 'Not Started';
      return effectiveStatus === appliedStatus;
    });
  }, [sessions, statuses, appliedStatus]);

  // Combined loading state
  const isLoading = sessionsLoading || statsLoading || statusesLoading;
  const error = sessionsError || statsError;

  // Filter handlers
  const handleApplyFilters = useCallback(() => {
    setAppliedSongId(stagedSongId);
    setAppliedStatus(stagedStatus);
    setAppliedStartDate(stagedStartDate);
    setAppliedEndDate(stagedEndDate);
  }, [stagedSongId, stagedStatus, stagedStartDate, stagedEndDate]);

  const handleClearFilters = useCallback(() => {
    // Reset staged to defaults
    setStagedSongId(DEFAULT_FILTERS.songId);
    setStagedStatus(DEFAULT_FILTERS.status);
    setStagedStartDate(DEFAULT_FILTERS.startDate);
    setStagedEndDate(DEFAULT_FILTERS.endDate);
    // Reset applied to defaults
    setAppliedSongId(DEFAULT_FILTERS.songId);
    setAppliedStatus(DEFAULT_FILTERS.status);
    setAppliedStartDate(DEFAULT_FILTERS.startDate);
    setAppliedEndDate(DEFAULT_FILTERS.endDate);
  }, []);

  // Sort column click handler
  const handleSortClick = useCallback((field: PracticeSortField) => {
    if (sortBy === field) {
      // Toggle direction if same field
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      // New field, default to descending
      setSortBy(field);
      setSortDirection('desc');
    }
  }, [sortBy]);

  // Get sort icon for column header
  const getSortIcon = (field: PracticeSortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4" />
    );
  };

  // Modal handlers
  const handleOpenLogModal = useCallback(() => {
    setEditingSession(undefined);
    setIsLogModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((session: PracticeSession) => {
    setEditingSession(session);
    setIsLogModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsLogModalOpen(false);
    setEditingSession(undefined);
  }, []);

  const handleSubmitSession = useCallback(
    async (data: PracticeFormData) => {
      try {
        if (editingSession) {
          await updateSession(editingSession.id, data);
          toast.success('Practice session updated');
        } else {
          await logSession(data);
          toast.success('Practice session logged');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        toast.error(editingSession ? `Failed to update session: ${message}` : `Failed to log session: ${message}`);
        throw err; // Re-throw so modal can handle it
      }
    },
    [editingSession, logSession, updateSession]
  );

  // Delete handlers
  const handleDeleteClick = useCallback((sessionId: string) => {
    setDeleteSessionId(sessionId);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteSessionId) {
      try {
        await deleteSession(deleteSessionId);
        toast.success('Practice session deleted');
      } catch {
        toast.error('Failed to delete practice session');
      }
      setDeleteSessionId(null);
    }
  }, [deleteSessionId, deleteSession]);

  const handleCancelDelete = useCallback(() => {
    setDeleteSessionId(null);
  }, []);

  // Handler for status changes from LogPracticeModal
  const handleStatusChange = useCallback(
    async (songId: string, newStatus: UserSongStatus, newConfidence?: number) => {
      if (!currentUserId) return;

      try {
        await supabaseStorageService.updateUserSongStatus(
          currentUserId,
          songId,
          newStatus,
          newConfidence
        );
        toast.success('Learning status updated');
        // Refresh the statuses cache so the UI updates
        await refetchStatuses();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        toast.error(`Failed to update status: ${message}`);
        throw err;
      }
    },
    [currentUserId, refetchStatuses]
  );

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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Practice History</h1>
          <p className="text-muted-foreground">
            Track your practice sessions and progress over time
          </p>
        </div>
        <Button onClick={handleOpenLogModal} className="self-start sm:self-auto">
          <Plus className="mr-2 h-4 w-4" />
          Log Practice
        </Button>
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
              {hasUnappliedChanges && (
                <CardDescription className="text-warning">
                  You have unapplied filter changes
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Song Filter */}
                <div className="space-y-2">
                  <Label htmlFor="song-filter">Song</Label>
                  <Select value={stagedSongId} onValueChange={setStagedSongId}>
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

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={stagedStatus} onValueChange={(value) => setStagedStatus(value as StatusFilterValue)}>
                    <SelectTrigger id="status-filter">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
                    value={stagedStartDate}
                    onChange={(e) => setStagedStartDate(e.target.value)}
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={stagedEndDate}
                    onChange={(e) => setStagedEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  onClick={handleApplyFilters}
                  disabled={!hasUnappliedChanges}
                  size="sm"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Apply Filters
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  disabled={isDefaultFilters && !hasUnappliedChanges}
                  size="sm"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sessions Table Card */}
          <Card>
            <CardHeader>
              <CardTitle>Practice Sessions</CardTitle>
              <CardDescription>
                {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredSessions.length === 0 ? (
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
                          <button
                            type="button"
                            onClick={() => handleSortClick('date')}
                            className="flex items-center hover:text-foreground transition-colors"
                          >
                            Date
                            {getSortIcon('date')}
                          </button>
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => handleSortClick('songId')}
                            className="flex items-center hover:text-foreground transition-colors"
                          >
                            Song
                            {getSortIcon('songId')}
                          </button>
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => handleSortClick('durationMinutes')}
                            className="flex items-center hover:text-foreground transition-colors"
                          >
                            Duration
                            {getSortIcon('durationMinutes')}
                          </button>
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground hidden sm:table-cell">
                          <button
                            type="button"
                            onClick={() => handleSortClick('tempoBpm')}
                            className="flex items-center hover:text-foreground transition-colors"
                          >
                            Tempo
                            {getSortIcon('tempoBpm')}
                          </button>
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
                        <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground w-16">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSessions.map(session => {
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
                            <td className="py-3 px-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenEditModal(session)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteClick(session.id)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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

      {/* Log/Edit Practice Modal */}
      <LogPracticeModal
        isOpen={isLogModalOpen}
        onClose={handleCloseModal}
        songs={songs}
        editSession={editingSession}
        onSubmit={handleSubmitSession}
        songStatuses={statuses}
        onStatusChange={handleStatusChange}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteSessionId !== null}
        title="Delete Practice Session"
        message="Are you sure you want to delete this practice session? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        variant="danger"
      />
    </div>
  );
});

PracticeHistory.displayName = 'PracticeHistory';
