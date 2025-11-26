import React, { memo, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Guitar,
  Music,
  Play,
  Plus,
  Star,
  Target,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import { EmptyState, StatusBadge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/routes';
import type { Song, BandEvent, BandMember } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

interface DashboardProps {
  songs: Song[];
  members: BandMember[];
  events?: BandEvent[];
  /**
   * Called when user clicks a song to navigate to its detail page.
   * Should be wrapped in useCallback in parent for stable reference.
   */
  onNavigateToSong: (songId: string) => void;
}

interface SongIssue {
  label: string;
  severity: 'high' | 'medium' | 'low';
}

interface SongWithUrgency {
  song: Song;
  score: number;
  issues: SongIssue[];
}

interface TimelineItem {
  id: string;
  title: string;
  date: string;
  type: 'PRACTICE' | 'GIG' | 'OTHER' | 'DEADLINE';
  location?: string;
  songId?: string;
  isEvent: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TIMELINE_ICON_MAP = {
  GIG: { icon: Star, className: 'text-primary fill-primary' },
  PRACTICE: { icon: Guitar, className: 'text-info' },
  DEADLINE: { icon: Target, className: 'text-destructive' },
  OTHER: { icon: Calendar, className: 'text-muted-foreground' },
} as const;

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Calculate urgency score and issues for a song
 */
function calculateSongUrgency(song: Song, today: Date): SongWithUrgency {
  const issues: SongIssue[] = [];
  let score = 0;

  // Skip performance ready songs
  if (song.status === 'Performance Ready') {
    return { song, score: 0, issues: [] };
  }

  // Missing charts is a blocker
  if (song.charts.length === 0) {
    issues.push({ label: 'No charts', severity: 'high' });
    score += 30;
  }

  // Missing backing track
  if (!song.backingTrackUrl && !song.backingTrackStoragePath) {
    issues.push({ label: 'No backing track', severity: 'low' });
    score += 5;
  }

  // Unassigned songs need attention
  if (song.assignments.length === 0) {
    issues.push({ label: 'Unassigned', severity: 'medium' });
    score += 20;
  }

  // Target date urgency
  if (song.targetDate) {
    const targetDate = new Date(song.targetDate);
    const daysUntil = Math.ceil(
      (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil < 0) {
      issues.push({ label: 'Overdue', severity: 'high' });
      score += 50;
    } else if (daysUntil <= 3) {
      issues.push({ label: `Due in ${daysUntil}d`, severity: 'high' });
      score += 40;
    } else if (daysUntil <= 7) {
      issues.push({ label: `Due in ${daysUntil}d`, severity: 'medium' });
      score += 25;
    }
  }

  // Status-based priority
  if (song.status === 'To Learn') {
    score += 15;
  } else if (song.status === 'In Progress') {
    score += 5;
  }

  return { song, score, issues };
}

/**
 * Format days until a date as human-readable string
 */
function formatDaysUntil(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 0) return `${Math.abs(days)}d ago`;
  return `in ${days}d`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const Dashboard: React.FC<DashboardProps> = memo(function Dashboard({
  songs,
  members: _members,
  onNavigateToSong,
  events = [],
}) {
  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // MEMOIZED COMPUTATIONS
  // ---------------------------------------------------------------------------

  // Next upcoming gig
  const nextGig = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events
      .filter(e => e.type === 'GIG' && new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  }, [events]);

  // Days until next gig
  const daysUntilNextGig = useMemo(() => {
    if (!nextGig) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const gigDate = new Date(nextGig.date);
    return Math.ceil((gigDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [nextGig]);

  // Readiness statistics
  const readinessStats = useMemo(() => {
    const total = songs.length;
    const ready = songs.filter(s => s.status === 'Performance Ready').length;
    const inProgress = songs.filter(s => s.status === 'In Progress').length;
    const toLearn = songs.filter(s => s.status === 'To Learn').length;
    const percent = total > 0 ? Math.round((ready / total) * 100) : 0;
    return { total, ready, inProgress, toLearn, percent };
  }, [songs]);

  // Songs that need attention (sorted by urgency)
  const songsNeedingAttention = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return songs
      .map(song => calculateSongUrgency(song, today))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [songs]);

  // Upcoming timeline (events + song deadlines, next 2 weeks)
  const upcomingTimeline = useMemo<TimelineItem[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoWeeksOut = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Map events
    const eventItems: TimelineItem[] = events
      .filter(e => {
        const d = new Date(e.date);
        return d >= today && d <= twoWeeksOut;
      })
      .map(e => ({
        id: e.id,
        title: e.title,
        date: e.date,
        type: e.type,
        location: e.location,
        isEvent: true,
      }));

    // Map song deadlines
    const deadlineItems: TimelineItem[] = songs
      .filter(s => s.targetDate && s.status !== 'Performance Ready')
      .filter(s => {
        const d = new Date(s.targetDate!);
        return d >= today && d <= twoWeeksOut;
      })
      .map(s => ({
        id: `deadline-${s.id}`,
        title: s.title,
        date: s.targetDate!,
        type: 'DEADLINE',
        songId: s.id,
        isEvent: false,
      }));

    return [...eventItems, ...deadlineItems]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 4);
  }, [events, songs]);

  // Coverage issues count
  const unassignedCount = useMemo(
    () => songs.filter(s => s.assignments.length === 0).length,
    [songs]
  );

  // ---------------------------------------------------------------------------
  // CALLBACKS
  // ---------------------------------------------------------------------------

  const handleNavigateToPractice = useCallback(() => {
    navigate(ROUTES.PRACTICE);
  }, [navigate]);

  const handleNavigateToSetlist = useCallback(() => {
    navigate(ROUTES.SETLIST);
  }, [navigate]);

  const handleNavigateToSchedule = useCallback(() => {
    navigate(ROUTES.SCHEDULE);
  }, [navigate]);

  const handleNavigateToBand = useCallback(() => {
    navigate(ROUTES.BAND);
  }, [navigate]);

  const handleNavigateToPerformance = useCallback(() => {
    navigate(ROUTES.PERFORMANCE);
  }, [navigate]);

  // ---------------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------------

  const renderTimelineIcon = (type: TimelineItem['type']) => {
    const config = TIMELINE_ICON_MAP[type];
    const Icon = config.icon;
    return <Icon size={16} className={config.className} />;
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="relative p-4 sm:p-6 lg:p-10 space-y-8">
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-[0.03]"
          style={{
            background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Header with Quick Actions */}
      <header className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {/* Brawler serif for headline */}
          <h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">
            Band Overview
          </h2>
          {/* Glowing countdown badge or fallback subtitle */}
          {nextGig && daysUntilNextGig !== null ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-1.5 rounded-full',
                  'bg-gradient-to-r from-primary to-chart-2',
                  'text-primary-foreground font-mono text-sm font-bold',
                  'tracking-wider uppercase',
                  'shadow-lg shadow-primary/25',
                  'animate-count-in animate-pulse-glow'
                )}
              >
                <span className="text-lg tabular-nums">{daysUntilNextGig}</span>
                <span>{daysUntilNextGig === 1 ? 'day' : 'days'}</span>
              </span>
              <span className="text-muted-foreground">
                until{' '}
                <span className="text-foreground font-medium">{nextGig.title}</span>
              </span>
            </div>
          ) : (
            <p className="text-muted-foreground mt-2">Road to the next gig</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button onClick={handleNavigateToPractice} className="gap-2">
            <Play size={18} />
            Start Practice
          </Button>
          <Button variant="secondary" onClick={handleNavigateToPerformance} className="gap-2">
            <Star size={18} />
            Gig Mode
          </Button>
        </div>
      </header>

      {/* Stats Row - Band Readiness + Coming Up side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-slide-in-from-bottom fill-forwards opacity-0 stagger-1">
        {/* Band Readiness - Comprehensive Status Card */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            {/* Header row */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-serif text-foreground">
                  Band Readiness
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  {readinessStats.total} {readinessStats.total === 1 ? 'song' : 'songs'} in setlist
                  <button
                    type="button"
                    onClick={handleNavigateToSetlist}
                    className="text-muted-foreground/60 hover:text-primary inline-flex items-center gap-0.5 transition-colors"
                  >
                    <Plus size={12} />
                    <span className="text-xs">Add</span>
                  </button>
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold font-mono text-foreground tabular-nums">
                  {readinessStats.percent}
                  <span className="text-sm text-muted-foreground">%</span>
                </span>
                <p className="text-xs text-muted-foreground">gig ready</p>
              </div>
            </div>

            {/* Segmented progress bar with tooltips */}
            <TooltipProvider delayDuration={100}>
              <div className="h-3 bg-muted rounded-full overflow-hidden flex mb-3">
                {readinessStats.total > 0 && (
                  <>
                    {readinessStats.ready > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="h-full bg-success transition-all duration-500 animate-progress-fill cursor-help"
                            style={{
                              width: `${(readinessStats.ready / readinessStats.total) * 100}%`,
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{readinessStats.ready} Stage Ready</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {readinessStats.inProgress > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="h-full bg-info transition-all duration-500 cursor-help"
                            style={{
                              width: `${(readinessStats.inProgress / readinessStats.total) * 100}%`,
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{readinessStats.inProgress} In Progress</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {readinessStats.toLearn > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="h-full bg-warning transition-all duration-500 cursor-help"
                            style={{
                              width: `${(readinessStats.toLearn / readinessStats.total) * 100}%`,
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{readinessStats.toLearn} To Learn</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </>
                )}
              </div>

              {/* Legend with tooltips */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1.5 cursor-help">
                      <span className="w-2 h-2 rounded-full bg-success" aria-hidden="true" />
                      <span className="font-medium">{readinessStats.ready}</span> Ready
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Songs you&apos;ve mastered and are ready to perform</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1.5 cursor-help">
                      <span className="w-2 h-2 rounded-full bg-info" aria-hidden="true" />
                      <span className="font-medium">{readinessStats.inProgress}</span> In Progress
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Songs you&apos;re currently learning</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1.5 cursor-help">
                      <span className="w-2 h-2 rounded-full bg-warning" aria-hidden="true" />
                      <span className="font-medium">{readinessStats.toLearn}</span> To Learn
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Songs you haven&apos;t started learning yet</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            {/* Assignment warning */}
            {unassignedCount > 0 && (
              <button
                type="button"
                onClick={handleNavigateToBand}
                className="mt-4 w-full flex items-center gap-2 p-2.5 rounded-lg bg-warning/10 hover:bg-warning/15 transition-colors text-left group"
              >
                <AlertTriangle size={16} className="text-warning shrink-0" />
                <span className="text-sm text-foreground">
                  <span className="font-semibold">{unassignedCount}</span>{' '}
                  {unassignedCount === 1 ? 'song needs' : 'songs need'} role assignments
                </span>
                <ArrowRight
                  size={14}
                  className="ml-auto text-muted-foreground group-hover:text-foreground transition-colors"
                />
              </button>
            )}
            {unassignedCount === 0 && (
              <div className="mt-4 flex items-center gap-2 p-2.5 rounded-lg bg-success/10">
                <CheckCircle2 size={16} className="text-success shrink-0" />
                <span className="text-sm text-foreground">All songs have role assignments</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coming Up - Compact Timeline */}
        <Card className="relative overflow-hidden">
          <CardHeader className="py-2.5 px-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-serif text-foreground">Coming Up</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleNavigateToSchedule}>
                View Schedule
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-0 pb-3 px-4">
            {upcomingTimeline.length === 0 ? (
              <div className="text-center py-4">
                <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming events</p>
              </div>
            ) : (
              upcomingTimeline.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-start gap-2.5">
                  {/* Date stamp - compact */}
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center',
                      'w-10 h-10 rounded-md shrink-0',
                      'bg-muted border border-border',
                      item.type === 'GIG' && 'border-primary/50 bg-primary/10'
                    )}
                  >
                    <span className="text-sm font-bold font-mono leading-none tabular-nums">
                      {new Date(item.date).getDate()}
                    </span>
                    <span className="text-[8px] font-bold uppercase text-muted-foreground">
                      {new Date(item.date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>

                  {/* Event details */}
                  <div
                    className={cn(
                      'flex-1 min-w-0 py-0.5',
                      item.type === 'GIG' && 'pl-2 border-l-2 border-primary'
                    )}
                  >
                    {item.isEvent ? (
                      <p className="font-medium text-foreground text-sm leading-tight line-clamp-1">
                        {item.title}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onNavigateToSong(item.songId!)}
                        className="font-medium text-foreground text-sm leading-tight hover:text-primary hover:underline text-left line-clamp-1"
                      >
                        {item.title} due
                      </button>
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                      {renderTimelineIcon(item.type)}
                      <span>{formatDaysUntil(item.date)}</span>
                      {item.location && (
                        <>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="truncate max-w-[80px]">{item.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Practice Queue - Full Width */}
      <Card className="overflow-hidden animate-slide-in-from-bottom fill-forwards opacity-0 stagger-2">
        <CardHeader className="py-2.5 px-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif text-foreground">Practice Queue</h3>
            {songs.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleNavigateToSetlist}>
                View All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {songs.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Music}
                title="No songs yet"
                description="Add your first song to start tracking your setlist progress."
                action={{
                  label: 'Add Song',
                  onClick: handleNavigateToSetlist,
                }}
              />
            </div>
          ) : songsNeedingAttention.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success mb-4" />
              <h3 className="font-semibold text-lg text-foreground">All caught up!</h3>
              <p className="text-muted-foreground text-sm mt-1">
                No songs need immediate attention.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {songsNeedingAttention.map(({ song, issues }) => {
                // Separate due date from other issues
                const dueIssue = issues.find(i => i.label.includes('Due') || i.label === 'Overdue');
                
                return (
                  <div
                    key={song.id}
                    className={cn(
                      'relative flex items-center gap-4 px-4 py-2.5',
                      'border-l-[3px] border-l-primary/60',
                      'hover:bg-muted/30 transition-colors'
                    )}
                  >
                    {/* Left: Song title + Edit link */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate text-sm">
                        {song.title}
                      </p>
                      <button
                        type="button"
                        onClick={() => onNavigateToSong(song.id)}
                        className="text-[11px] text-muted-foreground/60 hover:text-primary inline-flex items-center gap-0.5 shrink-0"
                      >
                        Edit <ArrowRight size={10} />
                      </button>
                    </div>

                    {/* Right: Status + Due + Practice */}
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={song.status} />
                      {dueIssue && (
                        <span
                          className={cn(
                            'text-[11px] font-medium',
                            dueIssue.severity === 'high'
                              ? 'text-destructive'
                              : 'text-warning'
                          )}
                        >
                          {dueIssue.label}
                        </span>
                      )}
                      <Button
                        size="sm"
                        onClick={() => navigate(ROUTES.PRACTICE)}
                        className="gap-1 h-7 px-2.5 text-xs"
                        aria-label={`Practice ${song.title}`}
                      >
                        <Play size={12} />
                        Practice
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';
