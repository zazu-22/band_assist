import React, { memo } from 'react';
import { Users, User } from 'lucide-react';
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
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
 * Shows up to two badges with clear visual distinction:
 * 1. Band status (if showBandStatus is true): Shows band's official song status
 *    - Icon: Users (group icon)
 *    - Tooltip: "Band's official status for this song"
 * 2. Personal status (if userStatus exists): Shows user's learning progress
 *    - Icon: User (person icon)
 *    - Tooltip: "Your personal learning progress"
 *
 * Design System:
 * - Uses Badge primitive with semantic variants
 * - Icons provide visual distinction beyond color
 * - Tooltips provide additional context on hover/focus
 * - Accessible via aria-labels and screen reader support
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
    <TooltipProvider delayDuration={300}>
      <div className={`flex items-center gap-2 flex-wrap ${className ?? ''}`}>
        {/* Band Status Badge */}
        {showBandStatus && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant={getBandStatusVariant(song.status)}
                className="gap-1"
                aria-label={`Band status: ${song.status}`}
              >
                <Users size={12} aria-hidden="true" />
                <span>{song.status}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Band&apos;s official status for this song</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Personal Status Badge - only show when user has a status */}
        {userStatus && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant={getUserStatusVariant(userStatus.status)}
                className="gap-1"
                aria-label={`Your progress: ${userStatus.status}`}
              >
                <User size={12} aria-hidden="true" />
                <span>{userStatus.status}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Your personal learning progress</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
});

SongStatusBadges.displayName = 'SongStatusBadges';
