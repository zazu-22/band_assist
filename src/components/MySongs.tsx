import React, { memo, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Play, User, MoreHorizontal, Check } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/primitives';
import { EmptyState, toast } from '@/components/ui';
import { SongStatusBadges } from '@/components/SongStatusBadges';
import { cn } from '@/lib/utils';
import { getPracticeRoute } from '@/routes';
import { useLinkedMember } from '@/hooks/useLinkedMember';
import { useAllUserSongStatuses } from '@/hooks/useUserSongStatus';
import { useAppActions, useAppData } from '@/contexts';
import { supabaseStorageService } from '@/services/supabaseStorageService';
import type { Song, UserSongProgress, UserSongStatus } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

interface MySongsProps {
  onNavigateToSong: (songId: string) => void;
}

interface SongWithStatus {
  song: Song;
  userStatus: UserSongProgress | undefined;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SongRowProps {
  song: Song;
  userStatus: UserSongProgress | undefined;
  onNavigateToSong: (id: string) => void;
  onPractice: (id: string) => void;
  onStatusChange: (songId: string, newStatus: UserSongStatus) => void;
}

// Status options for the dropdown menu
const STATUS_OPTIONS: { value: UserSongStatus; label: string }[] = [
  { value: 'Not Started', label: 'Not Started' },
  { value: 'Learning', label: 'Learning' },
  { value: 'Learned', label: 'Learned' },
  { value: 'Mastered', label: 'Mastered' },
];

const SongRow = memo(function SongRow({
  song,
  userStatus,
  onNavigateToSong,
  onPractice,
  onStatusChange,
}: SongRowProps) {
  const currentStatus = userStatus?.status || 'Not Started';

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-3',
        'border-l-[3px] border-l-primary/60',
        'border-b border-border/30 last:border-b-0',
        'hover:bg-muted/30 transition-colors'
      )}
    >
      {/* Song info - clickable link to song detail */}
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onNavigateToSong(song.id)}
          className={cn(
            'text-left cursor-pointer group',
            'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          <p className="font-semibold text-foreground truncate group-hover:text-primary group-hover:underline transition-colors">
            {song.title}
          </p>
          <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
        </button>
      </div>

      {/* Status badges - now uses SongStatusBadges for clear distinction */}
      <div className="flex items-center gap-2 shrink-0">
        <SongStatusBadges song={song} userStatus={userStatus} />
      </div>

      {/* Practice button */}
      <Button
        size="sm"
        onClick={() => onPractice(song.id)}
        className="gap-1 h-8 px-3"
        aria-label={`Practice ${song.title}`}
      >
        <Play size={14} />
        Practice
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
          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onStatusChange(song.id, option.value)}
              className="flex items-center justify-between"
            >
              <span>{option.label}</span>
              {currentStatus === option.value && (
                <Check className="h-4 w-4 ml-2 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
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
  );
});

SongRow.displayName = 'SongRow';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

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

  // Filter songs assigned to the current user's linked member
  const mySongs = useMemo<SongWithStatus[]>(() => {
    if (!linkedMember) return [];

    return songs
      .filter(song =>
        song.assignments.some(a => a.memberId === linkedMember.id)
      )
      .map(song => ({
        song,
        userStatus: userSongStatuses.get(song.id),
      }));
  }, [songs, linkedMember, userSongStatuses]);

  // Group songs by user learning status
  const groupedSongs = useMemo(() => {
    const notStarted: SongWithStatus[] = [];
    const learning: SongWithStatus[] = [];
    const learned: SongWithStatus[] = [];
    const mastered: SongWithStatus[] = [];

    for (const item of mySongs) {
      const status = item.userStatus?.status || 'Not Started';
      switch (status) {
        case 'Not Started':
          notStarted.push(item);
          break;
        case 'Learning':
          learning.push(item);
          break;
        case 'Learned':
          learned.push(item);
          break;
        case 'Mastered':
          mastered.push(item);
          break;
      }
    }

    return { notStarted, learning, learned, mastered };
  }, [mySongs]);

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

      try {
        await supabaseStorageService.updateUserSongStatus(
          userId,
          songId,
          newStatus
        );
        toast.success('Learning status updated');
        // Refresh the statuses cache so the UI updates
        await refetchStatuses();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        toast.error(`Failed to update status: ${message}`);
      }
    },
    [session?.user?.id, refetchStatuses]
  );

  // ---------------------------------------------------------------------------
  // RENDER: Not linked state
  // ---------------------------------------------------------------------------

  if (!linkedMember) {
    return (
      <div className="relative p-4 sm:p-6 lg:p-10">
        {/* Ambient background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
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
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
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
            Songs assigned to <span className="font-medium text-foreground">{linkedMember.name}</span>
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

  const renderSection = (
    title: string,
    items: SongWithStatus[],
    staggerIndex: number,
    defaultOpen = true
  ) => {
    if (items.length === 0) return null;

    return (
      <Card className={cn(
        'overflow-hidden',
        'animate-slide-in-from-bottom animation-forwards opacity-0',
        `stagger-${staggerIndex}`
      )}>
        <CardHeader className="py-4 px-5 bg-muted/30">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold font-serif text-foreground">{title}</h3>
            <span className="text-sm text-muted-foreground font-mono tabular-nums">
              {items.length} {items.length === 1 ? 'song' : 'songs'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(defaultOpen ? items : items.slice(0, 5)).map(({ song, userStatus }) => (
            <SongRow
              key={song.id}
              song={song}
              userStatus={userStatus}
              onNavigateToSong={onNavigateToSong}
              onPractice={handlePractice}
              onStatusChange={handleStatusChange}
            />
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="relative p-4 sm:p-6 lg:p-10 space-y-6">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
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

      {/* Priority: Not Started and Learning first */}
      <div className="space-y-4">
        {renderSection('Not Started', groupedSongs.notStarted, 1)}
        {renderSection('Learning', groupedSongs.learning, 2)}
        {renderSection('Learned', groupedSongs.learned, 3)}
        {renderSection('Mastered', groupedSongs.mastered, 4)}
      </div>
    </div>
  );
});

MySongs.displayName = 'MySongs';
