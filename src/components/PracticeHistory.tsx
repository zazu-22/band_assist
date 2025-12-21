import React, { memo, useMemo, useState, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
import { useSongSections } from '@/hooks/useSongSections';
import { supabaseStorageService } from '@/services/supabaseStorageService';
import { getTodayDateString, getDateDaysAgo } from '@/lib/dateUtils';
import { getUserStatusVariant, USER_STATUS_OPTIONS } from '@/lib/statusConfig';
import type { Song, PracticeFilters, UserSongStatus, PracticeSortField, SortDirection, PracticeSession } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

interface PracticeHistoryProps {
  songs: Song[];
  currentUserId: string | null;
  currentBandId: string | null;
}

// Status filter options including 'all'
type StatusFilterValue = UserSongStatus | 'all';
const STATUS_FILTER_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  ...USER_STATUS_OPTIONS,
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

// =============================================================================
// VIRTUALIZED TABLE COMPONENT
// =============================================================================

// Row height for virtualization (py-3 = 12px * 2 + content ~= 48px)
const ROW_HEIGHT = 48;
// Max visible rows before scrolling
const MAX_VISIBLE_ROWS = 10;

interface VirtualizedSessionTableProps {
  sessions: PracticeSession[];
  songMap: Map<string, Song>;
  statuses: Map<string, { status: UserSongStatus; confidence?: number }>;
  onSortClick: (field: PracticeSortField) => void;
  getSortIcon: (field: PracticeSortField) => React.ReactNode;
  onEditSession: (session: PracticeSession) => void;
  onDeleteSession: (sessionId: string) => void;
}

const VirtualizedSessionTable = memo(function VirtualizedSessionTable({
  sessions,
  songMap,
  statuses,
  onSortClick,
  getSortIcon,
  onEditSession,
  onDeleteSession,
}: VirtualizedSessionTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate container height - show all rows if under MAX_VISIBLE_ROWS, otherwise cap at MAX_VISIBLE_ROWS
  const containerHeight = Math.min(sessions.length, MAX_VISIBLE_ROWS) * ROW_HEIGHT;

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is safe to use, React Compiler will skip this component
  const virtualizer = useVirtualizer({
    count: sessions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5, // Render 5 extra rows above/below viewport for smoother scrolling
  });

  const virtualRows = virtualizer.getVirtualItems();

  // Fallback: if virtualization returns no items but we have sessions, render all rows
  // This handles test environments (JSDOM) where DOM measurements don't work
  const shouldFallbackToNonVirtual = virtualRows.length === 0 && sessions.length > 0;

  // Memoized row renderer to prevent unnecessary recreations
  const renderRow = useCallback((session: PracticeSession, style?: React.CSSProperties) => {
    const song = songMap.get(session.songId);
    const songStatus = statuses.get(session.songId);

    return (
      <tr
        key={session.id}
        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
        style={style}
      >
        <td className="w-[12%] py-3 px-4 text-sm text-foreground">
          {formatDate(session.date)}
        </td>
        <td className="w-[18%] py-3 px-4 text-sm text-foreground font-medium truncate">
          {song?.title || 'Unknown Song'}
        </td>
        <td className="w-[10%] py-3 px-4 text-sm text-foreground font-mono tabular-nums">
          {session.durationMinutes}m
        </td>
        <td className="w-[10%] py-3 px-4 text-sm text-muted-foreground font-mono tabular-nums hidden sm:table-cell">
          {session.tempoBpm ? `${session.tempoBpm} BPM` : '—'}
        </td>
        <td className="w-[15%] py-3 px-4 text-sm text-muted-foreground hidden md:table-cell truncate">
          {session.sectionsPracticed && session.sectionsPracticed.length > 0
            ? session.sectionsPracticed.join(', ')
            : '—'}
        </td>
        <td className="w-[10%] py-3 px-4">
          <Badge variant={getUserStatusVariant(songStatus?.status)}>
            {songStatus?.status || 'Not Started'}
          </Badge>
        </td>
        <td className="w-[20%] py-3 px-4 text-sm text-muted-foreground hidden lg:table-cell truncate">
          {session.notes || '—'}
        </td>
        <td className="w-[5%] py-3 px-4 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditSession(session)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDeleteSession(session.id)}
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
  }, [songMap, statuses, onEditSession, onDeleteSession]);

  // Render table header (shared between virtual and fallback modes)
  // Using fixed widths to ensure header and body columns align
  const tableHeader = (
    <thead>
      <tr className="border-b border-border">
        <th className="w-[12%] text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
          <button
            type="button"
            onClick={() => onSortClick('date')}
            className="flex items-center hover:text-foreground transition-colors"
          >
            Date
            {getSortIcon('date')}
          </button>
        </th>
        <th className="w-[18%] text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
          <button
            type="button"
            onClick={() => onSortClick('songId')}
            className="flex items-center hover:text-foreground transition-colors"
          >
            Song
            {getSortIcon('songId')}
          </button>
        </th>
        <th className="w-[10%] text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
          <button
            type="button"
            onClick={() => onSortClick('durationMinutes')}
            className="flex items-center hover:text-foreground transition-colors"
          >
            Duration
            {getSortIcon('durationMinutes')}
          </button>
        </th>
        <th className="w-[10%] text-left py-3 px-4 text-sm font-semibold text-muted-foreground hidden sm:table-cell">
          <button
            type="button"
            onClick={() => onSortClick('tempoBpm')}
            className="flex items-center hover:text-foreground transition-colors"
          >
            Tempo
            {getSortIcon('tempoBpm')}
          </button>
        </th>
        <th className="w-[15%] text-left py-3 px-4 text-sm font-semibold text-muted-foreground hidden md:table-cell">
          Sections
        </th>
        <th className="w-[10%] text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
          Status
        </th>
        <th className="w-[20%] text-left py-3 px-4 text-sm font-semibold text-muted-foreground hidden lg:table-cell">
          Notes
        </th>
        <th className="w-[5%] text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
          <span className="sr-only">Actions</span>
        </th>
      </tr>
    </thead>
  );

  // Table class with fixed layout to ensure consistent column widths
  const tableClassName = "w-full table-fixed";

  // Column group to enforce consistent column widths between header and body tables
  // This ensures alignment when header and body are separate tables for virtualization
  // Note: Responsive hiding is handled by the <td>/<th> elements, not the <col> elements
  // Columns: Date(12%), Song(18%), Duration(10%), Tempo(10%), Sections(15%), Status(10%), Notes(20%), Actions(5%)
  const colGroup = (
    <colgroup>
      <col className="w-[12%]" />
      <col className="w-[18%]" />
      <col className="w-[10%]" />
      <col className="w-[10%]" />
      <col className="w-[15%]" />
      <col className="w-[10%]" />
      <col className="w-[20%]" />
      <col className="w-[5%]" />
    </colgroup>
  );

  // Fallback: render all rows without virtualization (for test environments)
  if (shouldFallbackToNonVirtual) {
    return (
      <div className="overflow-x-auto">
        <table className={tableClassName}>
          {colGroup}
          {tableHeader}
          <tbody>
            {sessions.map(session => renderRow(session))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Table Header - Always visible */}
      <table className={tableClassName}>
        {colGroup}
        {tableHeader}
      </table>

      {/* Virtualized Table Body */}
      <div
        ref={parentRef}
        className="overflow-y-auto"
        style={{ height: containerHeight, maxHeight: MAX_VISIBLE_ROWS * ROW_HEIGHT }}
        role="region"
        aria-label="Practice sessions list"
        tabIndex={0}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          <table className={tableClassName}>
            {colGroup}
            <tbody>
              {virtualRows.map(virtualRow => {
                const session = sessions[virtualRow.index];
                return renderRow(session, {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: ROW_HEIGHT,
                  transform: `translateY(${virtualRow.start}px)`,
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

VirtualizedSessionTable.displayName = 'VirtualizedSessionTable';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

// Default filter values
const DEFAULT_FILTERS = {
  songId: 'all' as string,
  sectionId: 'all' as string,  // NEW: section filter
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
  const [stagedSectionId, setStagedSectionId] = useState<string>(DEFAULT_FILTERS.sectionId);
  const [stagedStatus, setStagedStatus] = useState<StatusFilterValue>(DEFAULT_FILTERS.status);
  const [stagedStartDate, setStagedStartDate] = useState(DEFAULT_FILTERS.startDate);
  const [stagedEndDate, setStagedEndDate] = useState(DEFAULT_FILTERS.endDate);

  // Applied filter state (used for actual queries)
  const [appliedSongId, setAppliedSongId] = useState<string>(DEFAULT_FILTERS.songId);
  const [appliedSectionId, setAppliedSectionId] = useState<string>(DEFAULT_FILTERS.sectionId);
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
      stagedSectionId !== appliedSectionId ||
      stagedStatus !== appliedStatus ||
      stagedStartDate !== appliedStartDate ||
      stagedEndDate !== appliedEndDate
    );
  }, [stagedSongId, appliedSongId, stagedSectionId, appliedSectionId, stagedStatus, appliedStatus, stagedStartDate, appliedStartDate, stagedEndDate, appliedEndDate]);

  // Check if filters are at default values
  const isDefaultFilters = useMemo(() => {
    return (
      appliedSongId === DEFAULT_FILTERS.songId &&
      appliedSectionId === DEFAULT_FILTERS.sectionId &&
      appliedStatus === DEFAULT_FILTERS.status &&
      appliedStartDate === DEFAULT_FILTERS.startDate &&
      appliedEndDate === DEFAULT_FILTERS.endDate
    );
  }, [appliedSongId, appliedSectionId, appliedStatus, appliedStartDate, appliedEndDate]);

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

  // Fetch sections for the selected song (only when song filter is active)
  const filteredSongId = appliedSongId !== 'all' ? appliedSongId : null;
  const { sections: songSections } = useSongSections(filteredSongId, currentBandId);

  // Create song lookup map
  const songMap = useMemo(() => {
    return new Map(songs.map(song => [song.id, song]));
  }, [songs]);

  // Apply client-side status and section filters
  // Status is per-song (from user_song_status), so we filter sessions by their song's status
  // Section filter checks if session includes the selected section in sectionIds
  const filteredSessions = useMemo(() => {
    let result = sessions;

    // Filter by status
    if (appliedStatus !== 'all') {
      result = result.filter(session => {
        const songStatus = statuses.get(session.songId);
        // If no status exists, treat as 'Not Started'
        const effectiveStatus = songStatus?.status || 'Not Started';
        return effectiveStatus === appliedStatus;
      });
    }

    // Filter by section (only when song filter is active)
    if (appliedSectionId !== 'all' && appliedSongId !== 'all') {
      result = result.filter(session =>
        session.sectionIds?.includes(appliedSectionId) ?? false
      );
    }

    return result;
  }, [sessions, statuses, appliedStatus, appliedSectionId, appliedSongId]);

  // Combined loading state
  const isLoading = sessionsLoading || statsLoading || statusesLoading;
  const error = sessionsError || statsError;

  // Filter handlers
  const handleApplyFilters = useCallback(() => {
    setAppliedSongId(stagedSongId);
    setAppliedSectionId(stagedSectionId);
    setAppliedStatus(stagedStatus);
    setAppliedStartDate(stagedStartDate);
    setAppliedEndDate(stagedEndDate);
  }, [stagedSongId, stagedSectionId, stagedStatus, stagedStartDate, stagedEndDate]);

  const handleClearFilters = useCallback(() => {
    // Reset staged to defaults
    setStagedSongId(DEFAULT_FILTERS.songId);
    setStagedSectionId(DEFAULT_FILTERS.sectionId);
    setStagedStatus(DEFAULT_FILTERS.status);
    setStagedStartDate(DEFAULT_FILTERS.startDate);
    setStagedEndDate(DEFAULT_FILTERS.endDate);
    // Reset applied to defaults
    setAppliedSongId(DEFAULT_FILTERS.songId);
    setAppliedSectionId(DEFAULT_FILTERS.sectionId);
    setAppliedStatus(DEFAULT_FILTERS.status);
    setAppliedStartDate(DEFAULT_FILTERS.startDate);
    setAppliedEndDate(DEFAULT_FILTERS.endDate);
  }, []);

  // Clear section filter when song changes
  const handleSongFilterChange = useCallback((value: string) => {
    setStagedSongId(value);
    // Reset section filter when song changes since sections are song-specific
    setStagedSectionId('all');
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

  // Get sort icon for column header (memoized to preserve VirtualizedSessionTable memo optimization)
  const getSortIcon = useCallback((field: PracticeSortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4" />
    );
  }, [sortBy, sortDirection]);

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
      <div className="relative p-4 sm:p-6 lg:p-10 space-y-8">
        {/* Ambient background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div
            className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full opacity-[0.03]"
            style={{
              background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Header */}
        <header>
          <h1 className="text-4xl font-bold font-serif text-foreground tracking-tight">Practice History</h1>
          <p className="text-muted-foreground mt-2">
            Track your practice sessions and progress over time
          </p>
        </header>

        <EmptyState
          icon={Music}
          title="Link Your Account"
          description="Link your account to a band member to track your personal practice history and progress."
        />
      </div>
    );
  }

  return (
    <div className="relative p-4 sm:p-6 lg:p-10 space-y-8">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{
            background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold font-serif text-foreground tracking-tight">Practice History</h1>
          <p className="text-muted-foreground mt-2">
            Track your practice sessions and progress over time
          </p>
        </div>
        <Button onClick={handleOpenLogModal} className="self-start sm:self-auto gap-2">
          <Plus className="h-4 w-4" />
          Log Practice
        </Button>
      </header>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-in-from-bottom animation-forwards opacity-0 stagger-1">
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
          <Card className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-2">
            <CardHeader className="py-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-serif">Filters</CardTitle>
                {hasUnappliedChanges && (
                  <span className="text-xs font-medium text-warning">
                    Unapplied changes
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Song Filter */}
                <div className="space-y-2">
                  <Label htmlFor="song-filter">Song</Label>
                  <Select value={stagedSongId} onValueChange={handleSongFilterChange}>
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

                {/* Section Filter - only shown when song filter is active */}
                {stagedSongId !== 'all' && songSections.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="section-filter">Section</Label>
                    <Select value={stagedSectionId} onValueChange={setStagedSectionId}>
                      <SelectTrigger id="section-filter">
                        <SelectValue placeholder="All Sections" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        {songSections.map(section => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={stagedStatus} onValueChange={(value) => setStagedStatus(value as StatusFilterValue)}>
                    <SelectTrigger id="status-filter">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_FILTER_OPTIONS.map(option => (
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
          <Card className="overflow-hidden animate-slide-in-from-bottom animation-forwards opacity-0 stagger-3">
            <CardHeader className="py-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-serif">Practice Sessions</CardTitle>
                <span className="text-sm text-muted-foreground font-mono tabular-nums">
                  {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredSessions.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={Music}
                    title="No Practice Sessions"
                    description="No practice sessions found for the selected filters. Start practicing to see your history here!"
                  />
                </div>
              ) : (
                <VirtualizedSessionTable
                  sessions={filteredSessions}
                  songMap={songMap}
                  statuses={statuses}
                  onSortClick={handleSortClick}
                  getSortIcon={getSortIcon}
                  onEditSession={handleOpenEditModal}
                  onDeleteSession={handleDeleteClick}
                />
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
        currentBandId={currentBandId}
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
