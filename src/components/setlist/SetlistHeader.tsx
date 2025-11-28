import React, { memo } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BandEvent } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface SetlistHeaderProps {
  /** Total number of songs in the setlist */
  songCount: number;
  /** Formatted total duration string (e.g., "1h 15m") */
  totalDuration: string;
  /** Next upcoming gig event (if any) */
  nextGig?: BandEvent;
  /** Number of days until the next gig */
  daysUntilNextGig?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * SetlistHeader - Page header with title and gig countdown context
 *
 * Design System Alignment:
 * - Title: text-4xl font-bold font-serif text-foreground tracking-tight
 * - Countdown badge: gradient + pulse-glow (same as Dashboard)
 * - Duration: font-mono tabular-nums
 */
export const SetlistHeader = memo(function SetlistHeader({
  songCount,
  totalDuration,
  nextGig,
  daysUntilNextGig,
}: SetlistHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {/* Brawler serif for headline */}
        <h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">
          Setlist Builder
        </h2>

        {/* Glowing countdown badge (same as Dashboard) or duration/count */}
        {nextGig && daysUntilNextGig !== undefined ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center gap-2 px-4 py-1.5 rounded-full',
                'bg-gradient-to-r from-primary to-chart-2',
                'text-primary-foreground font-mono text-sm font-bold',
                'tracking-wider uppercase',
                'shadow-lg shadow-primary/25',
                'animate-pulse-glow'
              )}
            >
              <span className="text-lg tabular-nums">{daysUntilNextGig}</span>
              <span>{daysUntilNextGig === 1 ? 'day' : 'days'}</span>
            </span>
            <span className="text-muted-foreground">
              until <span className="text-foreground font-medium">{nextGig.title}</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-2 text-muted-foreground">
            <Clock size={16} />
            <span className="font-mono tabular-nums">{totalDuration}</span>
            <span className="mx-2">•</span>
            <span>
              {songCount} {songCount === 1 ? 'Song' : 'Songs'}
            </span>
          </div>
        )}
      </div>
    </header>
  );
});

SetlistHeader.displayName = 'SetlistHeader';
