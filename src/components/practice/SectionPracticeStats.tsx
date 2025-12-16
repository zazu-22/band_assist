import React, { memo } from 'react';
import { Clock, ListMusic, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/primitives';
import { LoadingSpinner, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { SectionPracticeStat, SongSection } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface SectionPracticeStatsProps {
  /** Practice stats for each section */
  stats: SectionPracticeStat[];
  /** Sections for ordering and displaying bar info */
  sections: SongSection[];
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Optional className */
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format a date string to relative time
 * @example "2025-12-15" -> "Yesterday"
 * @example "2025-12-10" -> "6 days ago"
 */
function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';

  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
}

/**
 * Format minutes to human readable
 */
function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Displays practice statistics per section for a song.
 * Shows session count, total time, and last practiced date for each section.
 */
export const SectionPracticeStats: React.FC<SectionPracticeStatsProps> = memo(function SectionPracticeStats({
  stats,
  sections,
  isLoading = false,
  error = null,
  className,
}) {
  // Create a map for quick stat lookup
  const statsMap = new Map(stats.map(s => [s.sectionId, s]));

  // Order stats by section display order
  const orderedSections = [...sections].sort((a, b) => a.displayOrder - b.displayOrder);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <LoadingSpinner size="md" label="Loading practice stats..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('border-destructive', className)}>
        <CardContent className="p-6">
          <p className="text-destructive text-sm">
            Failed to load practice stats: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (sections.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <EmptyState
            icon={ListMusic}
            title="No Sections"
            description="This song doesn't have any sections defined yet."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-serif">Practice by Section</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {orderedSections.map((section) => {
          const stat = statsMap.get(section.id);
          const sessionCount = stat?.sessionCount ?? 0;
          const totalMinutes = stat?.totalMinutes ?? 0;
          const lastPracticed = stat?.lastPracticedAt ?? null;

          return (
            <div
              key={section.id}
              className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/30 border border-border/50"
            >
              {/* Section name and bars */}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">
                  {section.name}
                </p>
                <p className="text-xs text-muted-foreground font-mono tabular-nums">
                  Bars {section.startBar}-{section.endBar}
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 shrink-0">
                {/* Session count */}
                <div className="flex items-center gap-1.5 text-sm">
                  <ListMusic className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono tabular-nums">
                    {sessionCount}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {sessionCount === 1 ? 'session' : 'sessions'}
                  </span>
                </div>

                {/* Total time */}
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono tabular-nums">
                    {formatMinutes(totalMinutes)}
                  </span>
                </div>

                {/* Last practiced */}
                <Badge
                  variant={sessionCount > 0 ? 'secondary' : 'outline'}
                  className="gap-1"
                >
                  <Calendar className="h-3 w-3" />
                  {formatRelativeDate(lastPracticed)}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});

SectionPracticeStats.displayName = 'SectionPracticeStats';
