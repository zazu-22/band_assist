import React, { memo, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Play, User } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
} from '@/components/primitives';
import { EmptyState, StatusBadge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getPracticeRoute } from '@/routes';
import { useLinkedMember } from '@/hooks/useLinkedMember';
import { useAllUserSongStatuses } from '@/hooks/useUserSongStatus';
import { useAppActions, useAppData } from '@/contexts';
import type { Song, UserSongProgress } from '@/types';

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
// CONSTANTS
// =============================================================================

const USER_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  'Not Started': { label: 'Not Started', className: 'bg-muted text-muted-foreground' },
  'Learning': { label: 'Learning', className: 'bg-info/20 text-info' },
  'Learned': { label: 'Learned', className: 'bg-success/20 text-success' },
  'Mastered': { label: 'Mastered', className: 'bg-primary/20 text-primary' },
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SongRowProps {
  song: Song;
  userStatus: UserSongProgress | undefined;
  onNavigateToSong: (id: string) => void;
  onPractice: (id: string) => void;
}

const SongRow = memo(function SongRow({
  song,
  userStatus,
  onNavigateToSong,
  onPractice,
}: SongRowProps) {
  const statusConfig = userStatus?.status
    ? USER_STATUS_LABELS[userStatus.status]
    : USER_STATUS_LABELS['Not Started'];

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-3',
        'border-b border-border/30 last:border-b-0',
        'hover:bg-muted/30 transition-colors'
      )}
    >
      {/* Song info */}
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onNavigateToSong(song.id)}
          className="text-left hover:text-primary transition-colors"
        >
          <p className="font-semibold text-foreground truncate">{song.title}</p>
          <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
        </button>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={song.status} />
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            statusConfig.className
          )}
        >
          {statusConfig.label}
        </span>
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
  const { statuses: userSongStatuses } = useAllUserSongStatuses(
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

  // ---------------------------------------------------------------------------
  // RENDER: Not linked state
  // ---------------------------------------------------------------------------

  if (!linkedMember) {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <header className="mb-8">
          <h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">
            My Songs
          </h2>
          <p className="text-muted-foreground mt-2">Songs assigned to you</p>
        </header>

        <Card>
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
      <div className="p-4 sm:p-6 lg:p-10">
        <header className="mb-8">
          <h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">
            My Songs
          </h2>
          <p className="text-muted-foreground mt-2">
            Songs assigned to <span className="font-medium text-foreground">{linkedMember.name}</span>
          </p>
        </header>

        <Card>
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

  const renderSection = (title: string, items: SongWithStatus[], defaultOpen = true) => {
    if (items.length === 0) return null;

    return (
      <Card className="overflow-hidden">
        <CardHeader className="py-3 px-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <span className="text-sm text-muted-foreground">{items.length} songs</span>
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
            />
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-6">
      <header>
        <h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">
          My Songs
        </h2>
        <p className="text-muted-foreground mt-2">
          {mySongs.length} songs assigned to{' '}
          <span className="font-medium text-foreground">{linkedMember.name}</span>
        </p>
      </header>

      {/* Priority: Not Started and Learning first */}
      <div className="space-y-4">
        {renderSection('Not Started', groupedSongs.notStarted)}
        {renderSection('Learning', groupedSongs.learning)}
        {renderSection('Learned', groupedSongs.learned)}
        {renderSection('Mastered', groupedSongs.mastered)}
      </div>
    </div>
  );
});

MySongs.displayName = 'MySongs';
