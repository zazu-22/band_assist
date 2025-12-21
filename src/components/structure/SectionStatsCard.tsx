import React, { memo, useMemo } from 'react';
import { Clock, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/primitives/card';
import { cn } from '@/lib/utils';
import type { SongSection } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

/** Stats for a single section */
export interface SectionStat {
  sectionId: string;
  sectionName: string;
  totalMinutes: number;
  sessionCount: number;
}

export interface SectionStatsCardProps {
  /** Sections with names for display */
  sections: SongSection[];
  /** Map of sectionId to stats from usePracticeStats */
  sectionStats: Map<string, { totalMinutes: number; sessionCount: number }>;
  /** Loading state */
  isLoading?: boolean;
  /** Optional className */
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format minutes to a human-readable string
 * @example formatMinutes(90) // "1h 30m"
 * @example formatMinutes(45) // "45m"
 */
function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Displays per-section practice statistics.
 * Shows a horizontal bar chart or pill list of sections with practice time.
 * Positioned in SongDetail STRUCTURE tab below SectionList.
 */
export const SectionStatsCard: React.FC<SectionStatsCardProps> = memo(function SectionStatsCard({
  sections,
  sectionStats,
  isLoading,
  className,
}) {
  // Map section IDs to names and stats for display
  const statsWithNames = useMemo((): SectionStat[] => {
    return sections.map(section => ({
      sectionId: section.id,
      sectionName: section.name,
      totalMinutes: sectionStats.get(section.id)?.totalMinutes ?? 0,
      sessionCount: sectionStats.get(section.id)?.sessionCount ?? 0,
    }));
  }, [sections, sectionStats]);

  // Calculate max minutes for relative bar sizing
  const maxMinutes = useMemo(() => {
    const max = Math.max(...statsWithNames.map(s => s.totalMinutes), 0);
    return max > 0 ? max : 1; // Avoid division by zero
  }, [statsWithNames]);

  // Check if there's any practice data
  const hasPracticeData = statsWithNames.some(s => s.sessionCount > 0);

  // Show loading skeleton
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-serif">Practice by Section</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex justify-between mb-1">
                  <div className="h-4 w-20 bg-muted rounded" />
                  <div className="h-4 w-12 bg-muted rounded" />
                </div>
                <div className="h-2 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // No sections defined
  if (sections.length === 0) {
    return null;
  }

  // No practice data yet
  if (!hasPracticeData) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-serif">Practice by Section</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No practice sessions logged for sections yet. Start practicing to see your progress here!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-serif">Practice by Section</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {statsWithNames.map(stat => {
            const barWidth = stat.totalMinutes > 0
              ? Math.max((stat.totalMinutes / maxMinutes) * 100, 5) // Minimum 5% for visibility
              : 0;

            return (
              <div key={stat.sectionId}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-foreground truncate">
                    {stat.sectionName}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      {stat.sessionCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatMinutes(stat.totalMinutes)}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full bg-primary rounded-full transition-all duration-300',
                      stat.totalMinutes === 0 && 'bg-muted-foreground/20'
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

SectionStatsCard.displayName = 'SectionStatsCard';
