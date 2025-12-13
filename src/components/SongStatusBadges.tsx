import React, { memo } from 'react';
import { Users, User } from 'lucide-react';
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import { getBandStatusVariant, getUserStatusVariant } from '@/lib/statusConfig';
import type { Song, UserSongProgress } from '@/types';

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
 * 2. Personal status: Shows user's learning progress
 *    - Icon: User (person icon)
 *    - Tooltip: "Your personal learning progress"
 *    - Defaults to "Not Started" when userStatus is undefined
 *    - Hidden when userStatus is explicitly null (for band-only views)
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
  // Determine whether to show user status badge and what status to display
  // - null: explicitly hide the user badge (band-only view)
  // - undefined: show badge with "Not Started" default
  // - UserSongProgress: show badge with actual status
  const showUserStatus = userStatus !== null;
  const displayUserStatus = userStatus?.status ?? 'Not Started';

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

        {/* Personal Status Badge - defaults to "Not Started", hidden when null */}
        {showUserStatus && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant={getUserStatusVariant(displayUserStatus)}
                className="gap-1"
                aria-label={`Your progress: ${displayUserStatus}`}
              >
                <User size={12} aria-hidden="true" />
                <span>{displayUserStatus}</span>
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
