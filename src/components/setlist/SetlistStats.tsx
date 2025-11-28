import React, { memo, useMemo } from 'react';
import {
  Card,
  CardContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import type { Song } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface SetlistStatsProps {
  /** Songs in the setlist to calculate stats from */
  songs: Song[];
}

interface StatusStats {
  total: number;
  ready: number;
  inProgress: number;
  toLearn: number;
  percent: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * SetlistStats - Readiness metrics card with segmented progress bar
 *
 * Design System Alignment:
 * - Section title: text-lg font-serif text-foreground
 * - Percentage: text-3xl font-bold font-mono tabular-nums
 * - Progress bar: Segmented with bg-success, bg-info, bg-warning
 * - Animations: animate-progress-fill
 */
export const SetlistStats = memo(function SetlistStats({ songs }: SetlistStatsProps) {
  const stats: StatusStats = useMemo(() => {
    const total = songs.length;
    const ready = songs.filter(s => s.status === 'Performance Ready').length;
    const inProgress = songs.filter(s => s.status === 'In Progress').length;
    const toLearn = songs.filter(s => s.status === 'To Learn').length;
    const percent = total > 0 ? Math.round((ready / total) * 100) : 0;
    return { total, ready, inProgress, toLearn, percent };
  }, [songs]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-serif text-foreground">Setlist Readiness</h3>
            <p className="text-sm text-muted-foreground">
              {stats.total} {stats.total === 1 ? 'song' : 'songs'} in setlist
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold font-mono text-foreground tabular-nums">
              {stats.percent}
              <span className="text-sm text-muted-foreground">%</span>
            </span>
            <p className="text-xs text-muted-foreground">ready</p>
          </div>
        </div>

        {/* Segmented progress bar with tooltips */}
        <TooltipProvider delayDuration={100}>
          <div className="h-3 bg-muted rounded-full overflow-hidden flex mb-3">
            {stats.ready > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="h-full bg-success animate-progress-fill cursor-help"
                    style={{ width: `${(stats.ready / stats.total) * 100}%` }}
                    aria-label={`${stats.ready} Stage Ready`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{stats.ready} Stage Ready</p>
                </TooltipContent>
              </Tooltip>
            )}
            {stats.inProgress > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="h-full bg-info animate-progress-fill cursor-help"
                    style={{
                      width: `${(stats.inProgress / stats.total) * 100}%`,
                      animationDelay: '100ms',
                    }}
                    aria-label={`${stats.inProgress} In Progress`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{stats.inProgress} In Progress</p>
                </TooltipContent>
              </Tooltip>
            )}
            {stats.toLearn > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="h-full bg-warning animate-progress-fill cursor-help"
                    style={{
                      width: `${(stats.toLearn / stats.total) * 100}%`,
                      animationDelay: '200ms',
                    }}
                    aria-label={`${stats.toLearn} To Learn`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{stats.toLearn} To Learn</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Legend with tooltips */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span>Stage Ready</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{stats.ready} songs ready to perform</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <div className="w-2 h-2 rounded-full bg-info" />
                  <span>In Progress</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{stats.inProgress} songs being learned</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span>To Learn</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{stats.toLearn} songs not started</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
});

SetlistStats.displayName = 'SetlistStats';
