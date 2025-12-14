import React, { memo, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Music,
  Play,
  User,
  MoreHorizontal,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  Search,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Label,
} from '@/components/primitives';
import { EmptyState, toast } from '@/components/ui';
import { SongStatusBadges } from '@/components/SongStatusBadges';
import { cn } from '@/lib/utils';
import { getPracticeRoute } from '@/routes';
import { useLinkedMember } from '@/hooks/useLinkedMember';
import { useAllUserSongStatuses } from '@/hooks/useUserSongStatus';
import { usePracticeSessions } from '@/hooks/usePracticeSessions';
import { useAppActions, useAppData } from '@/contexts';
import { supabaseStorageService } from '@/services/supabaseStorageService';
import {
  BAND_STATUS_OPTIONS,
  USER_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  getPriorityVariant,
  getPriorityLabel,
} from '@/lib/statusConfig';
import type { Song, UserSongProgress, UserSongStatus, PracticePriority, SortDirection } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

interface MySongsProps {
  onNavigateToSong: (songId: string) => void;
}

interface SongWithStatus {
  song: Song;
  userStatus: UserSongProgress | undefined;
  totalPracticeMinutes: number;
}

// Sort field options for My Songs table
type MySongsSortField = 'title' | 'artist' | 'bandStatus' | 'userStatus' | 'practiceTime';

// Status filter options including 'all'
type BandStatusFilterValue = Song['status'] | 'all';
type UserStatusFilterValue = UserSongStatus | 'all';

// Status options for the dropdown menu
const STATUS_OPTIONS: { value: UserSongStatus; label: string }[] = [
  { value: 'Not Started', label: 'Not Started' },
  { value: 'Learning', label: 'Learning' },
  { value: 'Learned', label: 'Learned' },
  { value: 'Mastered', label: 'Mastered' },
];

// Filter options
const BAND_STATUS_FILTER_OPTIONS: { value: BandStatusFilterValue; label: string }[] = [
  { value: 'all', label: 'All Band Statuses' },
  ...BAND_STATUS_OPTIONS,
];

const USER_STATUS_FILTER_OPTIONS: { value: UserStatusFilterValue; label: string }[] = [
  { value: 'all', label: 'All User Statuses' },
  ...USER_STATUS_OPTIONS,
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert minutes to "Xh Ym" format
 */
function formatMinutesToHours(minutes: number): string {
  if (minutes === 0) {
    return '0m';
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Get numeric priority for user status (for sorting)
 */
function getUserStatusPriority(status: UserSongStatus | undefined): number {
  switch (status) {
    case 'Mastered':
      return 4;
    case 'Learned':
      return 3;
    case 'Learning':
      return 2;
    case 'Not Started':
    default:
      return 1;
  }
}

/**
 * Get numeric priority for band status (for sorting)
 */
function getBandStatusPriority(status: Song['status']): number {
  switch (status) {
    case 'Performance Ready':
      return 3;
    case 'In Progress':
      return 2;
    case 'To Learn':
    default:
      return 1;
  }
}

// =============================================================================
// VIRTUALIZED TABLE COMPONENT
// =============================================================================

// Row height for virtualization (py-3 = 12px * 2 + content ~= 48px)
const ROW_HEIGHT = 48;
// Max visible rows before scrolling
const MAX_VISIBLE_ROWS = 10;

// Column header IDs for accessibility (associates header with body cells in split table)
const COLUMN_IDS = {
  title: 'mysongs-col-title',
  artist: 'mysongs-col-artist',
  bandStatus: 'mysongs-col-bandstatus',
  userStatus: 'mysongs-col-userstatus',
  priority: 'mysongs-col-priority',
  practiceTime: 'mysongs-col-practicetime',
  actions: 'mysongs-col-actions',
} as const;

interface VirtualizedSongTableProps {
  songs: SongWithStatus[];
  sortBy: MySongsSortField;
  sortDirection: SortDirection;
  onSortClick: (field: MySongsSortField) => void;
  getSortIcon: (field: MySongsSortField) => React.ReactNode;
  onNavigateToSong: (id: string) => void;
  onPractice: (id: string) => void;
  onStatusChange: (songId: string, newStatus: UserSongStatus) => void;
  onPriorityChange: (songId: string, newPriority: PracticePriority | null) => void;
}

const VirtualizedSongTable = memo(function VirtualizedSongTable({
  songs,
  sortBy,
  sortDirection,
  onSortClick,
  getSortIcon,
  onNavigateToSong,
  onPractice,
  onStatusChange,
  onPriorityChange,
}: VirtualizedSongTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate container height - show all rows if under MAX_VISIBLE_ROWS, otherwise cap at MAX_VISIBLE_ROWS
  const containerHeight = Math.min(songs.length, MAX_VISIBLE_ROWS) * ROW_HEIGHT;

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is safe to use, React Compiler will skip this component
  const virtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5, // Render 5 extra rows above/below viewport for smoother scrolling
  });

  const virtualRows = virtualizer.getVirtualItems();

  // Fallback: if virtualization returns no items but we have songs, render all rows
  // This handles test environments (JSDOM) where DOM measurements don't work
  const shouldFallbackToNonVirtual = virtualRows.length === 0 && songs.length > 0;

  // Memoized row renderer
  const renderRow = useCallback(
    (item: SongWithStatus, style?: React.CSSProperties) => {
      const { song, userStatus, totalPracticeMinutes } = item;
      const currentStatus = userStatus?.status || 'Not Started';
      const currentPriority = userStatus?.priority ?? null;

      return (
        <tr
          key={song.id}
          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
          style={style}
        >
          {/* Song Title - clickable, flexible width */}
          <td className="min-w-0 py-3 px-4" headers={COLUMN_IDS.title}>
            <button
              type="button"
              onClick={() => onNavigateToSong(song.id)}
              className={cn(
                'text-left cursor-pointer group w-full',
                'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
            >
              <span className="text-sm font-medium text-foreground group-hover:text-primary group-hover:underline transition-colors truncate block">
                {song.title}
              </span>
            </button>
          </td>
          {/* Artist - fixed width on sm+ */}
          <td className="w-28 py-3 px-4 text-sm text-muted-foreground hidden sm:table-cell" headers={COLUMN_IDS.artist}>
            <span className="truncate block">{song.artist}</span>
          </td>
          {/* Band Status - fixed width on md+ */}
          <td className="w-32 py-3 px-4 hidden md:table-cell whitespace-nowrap" headers={COLUMN_IDS.bandStatus}>
            <SongStatusBadges song={song} showBandStatus userStatus={null} />
          </td>
          {/* User Status - fixed width, always visible */}
          <td className="w-28 py-3 px-4 whitespace-nowrap" headers={COLUMN_IDS.userStatus}>
            <SongStatusBadges
              song={song}
              showBandStatus={false}
              userStatus={userStatus}
            />
          </td>
          {/* Priority - fixed width on md+ */}
          <td className="w-24 py-3 px-4 hidden md:table-cell whitespace-nowrap" headers={COLUMN_IDS.priority}>
            <Badge
              variant={getPriorityVariant(currentPriority)}
              className={cn(!currentPriority && 'opacity-50')}
              aria-label={`Priority: ${getPriorityLabel(currentPriority)}`}
            >
              {getPriorityLabel(currentPriority)}
            </Badge>
          </td>
          {/* Practice Time - fixed width on lg+ */}
          <td className="w-20 py-3 px-4 text-sm text-muted-foreground font-mono tabular-nums hidden lg:table-cell whitespace-nowrap" headers={COLUMN_IDS.practiceTime}>
            {formatMinutesToHours(totalPracticeMinutes)}
          </td>
          {/* Actions - auto width, shrink to fit content */}
          <td className="w-auto py-3 px-4" headers={COLUMN_IDS.actions}>
            <div className="flex items-center justify-end gap-2">
              {/* Practice button */}
              <Button
                size="sm"
                onClick={() => onPractice(song.id)}
                className="gap-1 h-8 px-3"
                aria-label={`Practice ${song.title}`}
              >
                <Play size={14} />
                <span className="hidden sm:inline">Practice</span>
              </Button>

              {/* Actions dropdown menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu for {song.title}</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* Change Status submenu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {STATUS_OPTIONS.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => {
                            if (option.value !== currentStatus) {
                              onStatusChange(song.id, option.value);
                            }
                          }}
                          className="flex items-center justify-between"
                        >
                          <span>{option.label}</span>
                          {currentStatus === option.value && (
                            <Check className="h-4 w-4 ml-2 text-primary" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  {/* Change Priority submenu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Change Priority</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {PRIORITY_OPTIONS.map((option) => (
                        <DropdownMenuItem
                          key={option.label}
                          onClick={() => {
                            if (option.value !== currentPriority) {
                              onPriorityChange(song.id, option.value);
                            }
                          }}
                          className="flex items-center justify-between"
                        >
                          <span>{option.label}</span>
                          {currentPriority === option.value && (
                            <Check className="h-4 w-4 ml-2 text-primary" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onNavigateToSong(song.id)}>
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPractice(song.id)}>
                    Practice Now
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </td>
        </tr>
      );
    },
    [onNavigateToSong, onPractice, onStatusChange, onPriorityChange]
  );

  // Render table header with IDs for accessibility (associates with body cells via headers attr)
  const tableHeader = (
    <thead>
      <tr className="border-b border-border">
        <th
          id={COLUMN_IDS.title}
          className="min-w-0 text-left py-3 px-4 text-sm font-semibold text-muted-foreground"
          aria-sort={sortBy === 'title' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
        >
          <button
            type="button"
            onClick={() => onSortClick('title')}
            className="flex items-center hover:text-foreground transition-colors"
          >
            Title
            {getSortIcon('title')}
          </button>
        </th>
        <th
          id={COLUMN_IDS.artist}
          className="w-28 text-left py-3 px-4 text-sm font-semibold text-muted-foreground hidden sm:table-cell"
          aria-sort={sortBy === 'artist' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
        >
          <button
            type="button"
            onClick={() => onSortClick('artist')}
            className="flex items-center hover:text-foreground transition-colors"
          >
            Artist
            {getSortIcon('artist')}
          </button>
        </th>
        <th
          id={COLUMN_IDS.bandStatus}
          className="w-32 text-left py-3 px-4 text-sm font-semibold text-muted-foreground hidden md:table-cell"
          aria-sort={sortBy === 'bandStatus' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
        >
          <button
            type="button"
            onClick={() => onSortClick('bandStatus')}
            className="flex items-center hover:text-foreground transition-colors whitespace-nowrap"
          >
            Band Status
            {getSortIcon('bandStatus')}
          </button>
        </th>
        <th
          id={COLUMN_IDS.userStatus}
          className="w-28 text-left py-3 px-4 text-sm font-semibold text-muted-foreground"
          aria-sort={sortBy === 'userStatus' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
        >
          <button
            type="button"
            onClick={() => onSortClick('userStatus')}
            className="flex items-center hover:text-foreground transition-colors whitespace-nowrap"
          >
            My Status
            {getSortIcon('userStatus')}
          </button>
        </th>
        <th
          id={COLUMN_IDS.priority}
          className="w-24 text-left py-3 px-4 text-sm font-semibold text-muted-foreground hidden md:table-cell"
        >
          <span>Priority</span>
        </th>
        <th
          id={COLUMN_IDS.practiceTime}
          className="w-20 text-left py-3 px-4 text-sm font-semibold text-muted-foreground hidden lg:table-cell"
          aria-sort={sortBy === 'practiceTime' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
        >
          <button
            type="button"
            onClick={() => onSortClick('practiceTime')}
            className="flex items-center hover:text-foreground transition-colors"
          >
            Practice
            {getSortIcon('practiceTime')}
          </button>
        </th>
        <th
          id={COLUMN_IDS.actions}
          className="w-auto text-right py-3 px-4 text-sm font-semibold text-muted-foreground"
        >
          <span className="sr-only">Actions</span>
        </th>
      </tr>
    </thead>
  );

  // Table class - use auto layout for natural column sizing
  const tableClassName = 'w-full';

  // Fallback: render all rows without virtualization (for test environments)
  if (shouldFallbackToNonVirtual) {
    return (
      <div className="overflow-x-auto">
        <table className={tableClassName}>
          {tableHeader}
          <tbody>{songs.map((item) => renderRow(item))}</tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" role="grid" aria-label="Songs table" aria-rowcount={songs.length + 1}>
      {/* Table Header - Always visible */}
      <table className={tableClassName} role="rowgroup">
        {tableHeader}
      </table>

      {/* Virtualized Table Body */}
      <div
        ref={parentRef}
        className="overflow-y-auto"
        style={{ height: containerHeight, maxHeight: MAX_VISIBLE_ROWS * ROW_HEIGHT }}
        role="rowgroup"
        aria-label="Song rows"
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
            <tbody>
              {virtualRows.map((virtualRow) => {
                const item = songs[virtualRow.index];
                return renderRow(item, {
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

VirtualizedSongTable.displayName = 'VirtualizedSongTable';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

// Default filter values
const DEFAULT_FILTERS = {
  searchQuery: '',
  bandStatus: 'all' as BandStatusFilterValue,
  userStatus: 'all' as UserStatusFilterValue,
};

export const MySongs: React.FC<MySongsProps> = memo(function MySongs({
  onNavigateToSong,
}) {
  const navigate = useNavigate();
  const { currentBandId, session } = useAppActions();
  const { songs } = useAppData();
  const { linkedMember } = useLinkedMember(currentBandId);
  const { statuses: userSongStatuses, refetch: refetchStatuses } = useAllUserSongStatuses(
    session?.user?.id || null,
    currentBandId
  );

  // Fetch all practice sessions to compute total practice time per song
  const { sessions: practiceSessions } = usePracticeSessions(
    session?.user?.id || null,
    currentBandId
  );

  // Compute total practice time per song
  const practiceTimePerSong = useMemo(() => {
    const timeMap = new Map<string, number>();
    for (const session of practiceSessions) {
      const current = timeMap.get(session.songId) || 0;
      timeMap.set(session.songId, current + session.durationMinutes);
    }
    return timeMap;
  }, [practiceSessions]);

  // Staged filter state (UI edits these)
  const [stagedSearchQuery, setStagedSearchQuery] = useState(DEFAULT_FILTERS.searchQuery);
  const [stagedBandStatus, setStagedBandStatus] = useState<BandStatusFilterValue>(
    DEFAULT_FILTERS.bandStatus
  );
  const [stagedUserStatus, setStagedUserStatus] = useState<UserStatusFilterValue>(
    DEFAULT_FILTERS.userStatus
  );

  // Applied filter state (used for actual filtering)
  const [appliedSearchQuery, setAppliedSearchQuery] = useState(DEFAULT_FILTERS.searchQuery);
  const [appliedBandStatus, setAppliedBandStatus] = useState<BandStatusFilterValue>(
    DEFAULT_FILTERS.bandStatus
  );
  const [appliedUserStatus, setAppliedUserStatus] = useState<UserStatusFilterValue>(
    DEFAULT_FILTERS.userStatus
  );

  // Sort state (applies immediately, not staged)
  const [sortBy, setSortBy] = useState<MySongsSortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filter songs assigned to the current user's linked member
  const mySongs = useMemo<SongWithStatus[]>(() => {
    if (!linkedMember) return [];

    return songs
      .filter((song) => song.assignments.some((a) => a.memberId === linkedMember.id))
      .map((song) => ({
        song,
        userStatus: userSongStatuses.get(song.id),
        totalPracticeMinutes: practiceTimePerSong.get(song.id) || 0,
      }));
  }, [songs, linkedMember, userSongStatuses, practiceTimePerSong]);

  // Apply filters to songs
  const filteredSongs = useMemo(() => {
    return mySongs.filter((item) => {
      // Search filter (title or artist)
      if (appliedSearchQuery) {
        const query = appliedSearchQuery.toLowerCase();
        const titleMatch = item.song.title.toLowerCase().includes(query);
        const artistMatch = item.song.artist.toLowerCase().includes(query);
        if (!titleMatch && !artistMatch) return false;
      }

      // Band status filter
      if (appliedBandStatus !== 'all' && item.song.status !== appliedBandStatus) {
        return false;
      }

      // User status filter
      const userStatus = item.userStatus?.status || 'Not Started';
      if (appliedUserStatus !== 'all' && userStatus !== appliedUserStatus) {
        return false;
      }

      return true;
    });
  }, [mySongs, appliedSearchQuery, appliedBandStatus, appliedUserStatus]);

  // Apply sorting to filtered songs
  const sortedSongs = useMemo(() => {
    const sorted = [...filteredSongs].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = a.song.title.localeCompare(b.song.title);
          break;
        case 'artist':
          comparison = a.song.artist.localeCompare(b.song.artist);
          break;
        case 'bandStatus':
          comparison =
            getBandStatusPriority(a.song.status) - getBandStatusPriority(b.song.status);
          break;
        case 'userStatus':
          comparison =
            getUserStatusPriority(a.userStatus?.status) -
            getUserStatusPriority(b.userStatus?.status);
          break;
        case 'practiceTime':
          comparison = a.totalPracticeMinutes - b.totalPracticeMinutes;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredSongs, sortBy, sortDirection]);

  // Check if staged filters differ from applied filters
  const hasUnappliedChanges = useMemo(() => {
    return (
      stagedSearchQuery !== appliedSearchQuery ||
      stagedBandStatus !== appliedBandStatus ||
      stagedUserStatus !== appliedUserStatus
    );
  }, [
    stagedSearchQuery,
    appliedSearchQuery,
    stagedBandStatus,
    appliedBandStatus,
    stagedUserStatus,
    appliedUserStatus,
  ]);

  // Check if filters are at default values
  const isDefaultFilters = useMemo(() => {
    return (
      appliedSearchQuery === DEFAULT_FILTERS.searchQuery &&
      appliedBandStatus === DEFAULT_FILTERS.bandStatus &&
      appliedUserStatus === DEFAULT_FILTERS.userStatus
    );
  }, [appliedSearchQuery, appliedBandStatus, appliedUserStatus]);

  const handlePractice = useCallback(
    (songId: string) => {
      navigate(getPracticeRoute(songId));
    },
    [navigate]
  );

  // Handler for status changes from dropdown menu
  const handleStatusChange = useCallback(
    async (songId: string, newStatus: UserSongStatus) => {
      const userId = session?.user?.id;
      if (!userId) return;

      // Validate that the song belongs to the current band
      const songExistsInCurrentBand = songs.some((s) => s.id === songId);
      if (!songExistsInCurrentBand) {
        toast.error('Cannot update status for songs outside the current band');
        return;
      }

      try {
        await supabaseStorageService.updateUserSongStatus(userId, songId, newStatus);
        toast.success('Learning status updated');
        await refetchStatuses();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        toast.error(`Failed to update status: ${message}`);
      }
    },
    [session?.user?.id, refetchStatuses, songs]
  );

  // Handler for priority changes from dropdown menu
  const handlePriorityChange = useCallback(
    async (songId: string, newPriority: PracticePriority | null) => {
      const userId = session?.user?.id;
      if (!userId) return;

      // Validate that the song belongs to the current band
      const songExistsInCurrentBand = songs.some((s) => s.id === songId);
      if (!songExistsInCurrentBand) {
        toast.error('Cannot update priority for songs outside the current band');
        return;
      }

      try {
        await supabaseStorageService.updateUserSongPriority(userId, songId, newPriority);
        toast.success('Priority updated');
        await refetchStatuses();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        toast.error(`Failed to update priority: ${message}`);
      }
    },
    [session?.user?.id, refetchStatuses, songs]
  );

  // Filter handlers
  const handleApplyFilters = useCallback(() => {
    setAppliedSearchQuery(stagedSearchQuery);
    setAppliedBandStatus(stagedBandStatus);
    setAppliedUserStatus(stagedUserStatus);
  }, [stagedSearchQuery, stagedBandStatus, stagedUserStatus]);

  const handleClearFilters = useCallback(() => {
    // Reset staged to defaults
    setStagedSearchQuery(DEFAULT_FILTERS.searchQuery);
    setStagedBandStatus(DEFAULT_FILTERS.bandStatus);
    setStagedUserStatus(DEFAULT_FILTERS.userStatus);
    // Reset applied to defaults
    setAppliedSearchQuery(DEFAULT_FILTERS.searchQuery);
    setAppliedBandStatus(DEFAULT_FILTERS.bandStatus);
    setAppliedUserStatus(DEFAULT_FILTERS.userStatus);
  }, []);

  // Sort column click handler
  const handleSortClick = useCallback(
    (field: MySongsSortField) => {
      if (sortBy === field) {
        // Toggle direction if same field
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        // New field, default to ascending for text, descending for numbers
        setSortBy(field);
        setSortDirection(field === 'practiceTime' ? 'desc' : 'asc');
      }
    },
    [sortBy]
  );

  // Get sort icon for column header
  const getSortIcon = useCallback(
    (field: MySongsSortField) => {
      if (sortBy !== field) {
        return <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground/50" />;
      }
      return sortDirection === 'asc' ? (
        <ArrowUp className="ml-1 h-4 w-4" />
      ) : (
        <ArrowDown className="ml-1 h-4 w-4" />
      );
    },
    [sortBy, sortDirection]
  );

  // ---------------------------------------------------------------------------
  // RENDER: Not linked state
  // ---------------------------------------------------------------------------

  if (!linkedMember) {
    return (
      <div className="relative p-4 sm:p-6 lg:p-10">
        {/* Ambient background glow */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full opacity-[0.03]"
            style={{
              background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
            }}
          />
        </div>

        <header className="mb-8">
          <h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">
            My Songs
          </h2>
          <p className="text-muted-foreground mt-2">Songs assigned to you</p>
        </header>

        <Card className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-1">
          <CardContent className="p-8">
            <EmptyState
              icon={User}
              title="Link your account first"
              description="Go to Settings > Team to link your account to a band member. Then you'll see songs assigned to you here."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: No songs assigned
  // ---------------------------------------------------------------------------

  if (mySongs.length === 0) {
    return (
      <div className="relative p-4 sm:p-6 lg:p-10">
        {/* Ambient background glow */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full opacity-[0.03]"
            style={{
              background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
            }}
          />
        </div>

        <header className="mb-8">
          <h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">
            My Songs
          </h2>
          <p className="text-muted-foreground mt-2">
            Songs assigned to{' '}
            <span className="font-medium text-foreground">{linkedMember.name}</span>
          </p>
        </header>

        <Card className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-1">
          <CardContent className="p-8">
            <EmptyState
              icon={Music}
              title="No songs assigned"
              description="You don't have any songs assigned to you yet. Ask your band admin to assign you to some songs."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Main view
  // ---------------------------------------------------------------------------

  return (
    <div className="relative p-4 sm:p-6 lg:p-10 space-y-6">
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{
            background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
          }}
        />
      </div>

      <header>
        <h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">
          My Songs
        </h2>
        <p className="text-muted-foreground mt-2">
          <span className="font-mono tabular-nums">{mySongs.length}</span> songs assigned to{' '}
          <span className="font-medium text-foreground">{linkedMember.name}</span>
        </p>
      </header>

      {/* Filters Card */}
      <Card className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-1">
        <CardHeader className="py-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-serif">Filters</CardTitle>
            {hasUnappliedChanges && (
              <span className="text-xs font-medium text-warning">Unapplied changes</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search Filter */}
            <div className="space-y-2">
              <Label htmlFor="search-filter">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-filter"
                  type="text"
                  placeholder="Search by title or artist..."
                  value={stagedSearchQuery}
                  onChange={(e) => setStagedSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Band Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="band-status-filter">Band Status</Label>
              <Select
                value={stagedBandStatus}
                onValueChange={(value) =>
                  setStagedBandStatus(value as BandStatusFilterValue)
                }
              >
                <SelectTrigger id="band-status-filter">
                  <SelectValue placeholder="All Band Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {BAND_STATUS_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="user-status-filter">My Status</Label>
              <Select
                value={stagedUserStatus}
                onValueChange={(value) =>
                  setStagedUserStatus(value as UserStatusFilterValue)
                }
              >
                <SelectTrigger id="user-status-filter">
                  <SelectValue placeholder="All User Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {USER_STATUS_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleApplyFilters} disabled={!hasUnappliedChanges} size="sm">
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

      {/* Songs Table Card */}
      <Card className="overflow-hidden animate-slide-in-from-bottom animation-forwards opacity-0 stagger-2">
        <CardHeader className="py-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-serif">Songs</CardTitle>
            <span className="text-sm text-muted-foreground font-mono tabular-nums">
              {sortedSongs.length} {sortedSongs.length === 1 ? 'song' : 'songs'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sortedSongs.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Music}
                title="No songs match filters"
                description="Try adjusting your filters to see more songs."
              />
            </div>
          ) : (
            <VirtualizedSongTable
              songs={sortedSongs}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSortClick={handleSortClick}
              getSortIcon={getSortIcon}
              onNavigateToSong={onNavigateToSong}
              onPractice={handlePractice}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
});

MySongs.displayName = 'MySongs';
