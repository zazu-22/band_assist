import React, { memo } from 'react';
import { Badge } from '@/components/primitives';
import type { Song, UserSongProgress, UserSongStatus } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface SongStatusBadgesProps {
  /** Song data containing band status */
  song: Song;
  /** User's personal learning status for this song (optional) */
  userStatus?: UserSongProgress | null;
  /** Whether to show the band status badge (default: true) */
  showBandStatus?: boolean;
  /** Optional CSS class name */
  className?: string;
}

type BandStatus = Song['status'];
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Maps band song status to Badge variant
 * - 'Performance Ready' -> 'default' (green/primary)
 * - 'In Progress' -> 'secondary' (blue)
 * - 'To Learn' -> 'destructive' (red)
 */
function getBandStatusVariant(status: BandStatus): BadgeVariant {
  const map: Record<BandStatus, BadgeVariant> = {
    'Performance Ready': 'default',
    'In Progress': 'secondary',
    'To Learn': 'destructive',
  };
  return map[status] ?? 'outline';
}

/**
 * Maps user song learning status to Badge variant
 * - 'Mastered' -> 'default' (green/primary)
 * - 'Learned' -> 'secondary' (blue)
 * - 'Learning' -> 'outline' (neutral)
 * - 'Not Started' -> 'outline' (neutral)
 */
function getUserStatusVariant(status: UserSongStatus): BadgeVariant {
  const map: Record<UserSongStatus, BadgeVariant> = {
    'Mastered': 'default',
    'Learned': 'secondary',
    'Learning': 'outline',
    'Not Started': 'outline',
  };
  return map[status] ?? 'outline';
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * SongStatusBadges - Display band and personal learning status badges for a song
 *
 * Shows up to two badges:
 * 1. Band status (if showBandStatus is true): "Band: Performance Ready", etc.
 * 2. Personal status (if userStatus exists): "You: Mastered", etc.
 *
 * Design System:
 * - Uses Badge primitive with semantic variants
 * - Flexbox container with gap and wrap
 * - Status-appropriate color coding
 *
 * @example
 * ```tsx
 * const { statuses } = useAllUserSongStatuses(userId, bandId);
 * <SongStatusBadges song={song} userStatus={statuses.get(song.id)} />
 * ```
 */
export const SongStatusBadges = memo(function SongStatusBadges({
  song,
  userStatus,
  showBandStatus = true,
  className,
}: SongStatusBadgesProps) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className ?? ''}`}>
      {/* Band Status Badge */}
      {showBandStatus && (
        <Badge variant={getBandStatusVariant(song.status)}>
          Band: {song.status}
        </Badge>
      )}

      {/* Personal Status Badge - only show when user has a status */}
      {userStatus && (
        <Badge variant={getUserStatusVariant(userStatus.status)}>
          You: {userStatus.status}
        </Badge>
      )}
    </div>
  );
});

SongStatusBadges.displayName = 'SongStatusBadges';
