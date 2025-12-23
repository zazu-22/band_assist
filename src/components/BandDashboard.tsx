import React, { memo, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Music,
  Play,
  Users,
  X,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Avatar,
  AvatarFallback,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import { EmptyState, StatCard } from '@/components/ui';
import { INSTRUMENT_ICONS } from '@/constants';
import { getAvatarColor } from '@/lib/avatar';
import { cn } from '@/lib/utils';
import { ROUTES, getPracticeRoute } from '@/routes';
import type { BandMember, Song } from '@/types';

interface BandDashboardProps {
  members: BandMember[];
  songs: Song[];
  onNavigateToSong: (songId: string) => void;
}

/**
 * Filter songs where a member has at least one assignment or part assigned
 */
function filterMemberSongs(songs: Song[], memberId: string): Song[] {
  return songs.filter(
    song =>
      song.assignments.some(a => a.memberId === memberId) ||
      (song.parts && song.parts.some(p => p.assignedToMemberId === memberId))
  );
}

/**
 * Get unique instruments for a member from their roles or assignments
 */
function getMemberInstruments(member: BandMember, songs: Song[]): string[] {
  const instruments = new Set<string>();

  // Add preferred instrument if set
  if (member.preferredInstrument) {
    instruments.add(member.preferredInstrument);
  }

  // Add from member roles (default preferences)
  member.roles.forEach(role => instruments.add(role));

  // Add from song assignments
  songs.forEach(song => {
    song.assignments
      .filter(a => a.memberId === member.id)
      .forEach(a => instruments.add(a.role));
  });

  return Array.from(instruments);
}

/**
 * Calculate band readiness statistics
 */
function calculateReadinessStats(songs: Song[]) {
  const total = songs.length;
  const ready = songs.filter(s => s.status === 'Performance Ready').length;
  const inProgress = songs.filter(s => s.status === 'In Progress').length;
  const toLearn = songs.filter(s => s.status === 'To Learn').length;
  const percent = total > 0 ? Math.round((ready / total) * 100) : 0;
  return { total, ready, inProgress, toLearn, percent };
}

/**
 * Count songs with no assignments
 */
function countUnassignedSongs(songs: Song[]): number {
  return songs.filter(s => s.assignments.length === 0).length;
}

export const BandDashboard: React.FC<BandDashboardProps> = memo(function BandDashboard({
  members,
  songs,
  onNavigateToSong,
}) {
  const navigate = useNavigate();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const selectedMember = useMemo(
    () => members.find(m => m.id === selectedMemberId),
    [members, selectedMemberId]
  );

  // Memoize filtered songs for selected member
  const memberSongs = useMemo(
    () => (selectedMemberId ? filterMemberSongs(songs, selectedMemberId) : []),
    [songs, selectedMemberId]
  );

  // Band-level statistics
  const readinessStats = useMemo(() => calculateReadinessStats(songs), [songs]);
  const unassignedCount = useMemo(() => countUnassignedSongs(songs), [songs]);

  const handleSelectMember = useCallback((memberId: string) => {
    setSelectedMemberId(memberId);
  }, []);

  const handleCloseMemberDetails = useCallback(() => {
    setSelectedMemberId(null);
  }, []);

  const handleNavigateToSettings = useCallback(() => {
    navigate(ROUTES.SETTINGS);
  }, [navigate]);

  const handleNavigateToDashboard = useCallback(() => {
    navigate(ROUTES.DASHBOARD);
  }, [navigate]);

  const handleNavigateToSchedule = useCallback(() => {
    navigate(ROUTES.SCHEDULE);
  }, [navigate]);

  return (
    <div className="relative p-4 sm:p-6 lg:p-10 min-h-0 flex flex-col overflow-y-auto">
      {/* Ambient background glow - fixed size to maintain consistent fade on all viewports */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }}
        />
      </div>

      <header className="flex-shrink-0 mb-8">
        <h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">Band Lineup</h2>
        <p className="text-muted-foreground mt-1">
          View individual gig sheets and responsibilities
        </p>
      </header>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No band members"
          description="Add members in Settings to start tracking assignments and responsibilities."
          action={{
            label: 'Go to Settings',
            onClick: handleNavigateToSettings,
          }}
        />
      ) : (
        <>
          {/* Band Stats Row */}
          <TooltipProvider delayDuration={100}>
            <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-1"
                    tabIndex={0}
                  >
                    <StatCard
                      title="Total Members"
                      value={members.length}
                      icon={Users}
                      variant="default"
                      className="cursor-help"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Active band members</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-2"
                    tabIndex={0}
                  >
                    <StatCard
                      title="Total Songs"
                      value={songs.length}
                      icon={Music}
                      variant="info"
                      className="cursor-help"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Songs in the band repertoire</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-3"
                    tabIndex={0}
                  >
                    <StatCard
                      title="Performance Ready"
                      value={`${readinessStats.percent}%`}
                      icon={CheckCircle2}
                      variant="success"
                      subtitle={`${readinessStats.ready} of ${readinessStats.total} songs`}
                      className="cursor-help"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Songs marked Performance Ready</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-4"
                    tabIndex={0}
                  >
                    <StatCard
                      title="Needs Assignment"
                      value={unassignedCount}
                      icon={AlertTriangle}
                      variant={unassignedCount > 0 ? 'warning' : 'default'}
                      className="cursor-help"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Songs without any member assignments</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          {/* Grid of Members */}
          <div className="flex-shrink-0 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {members.map((member, index) => {
              const isSelected = selectedMemberId === member.id;
              const songCount = filterMemberSongs(songs, member.id).length;
              const instruments = getMemberInstruments(member, songs);
              const primaryInstrument = instruments[0];

              return (
                <Card
                  key={member.id}
                  className={cn(
                    'relative overflow-hidden cursor-pointer transition-all duration-200 group',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    'animate-slide-in-from-bottom animation-forwards opacity-0',
                    'border-l-[3px]',
                    isSelected
                      ? 'bg-muted/50 border-l-primary'
                      : 'hover:bg-muted/50 hover:border-border/80 border-l-primary/60'
                  )}
                  style={{ animationDelay: `${(index + 4) * 75}ms` }}
                  onClick={() => handleSelectMember(member.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectMember(member.id);
                    }
                  }}
                  aria-pressed={isSelected}
                  aria-label={`Select ${member.name} - ${songCount} song${songCount !== 1 ? 's' : ''}`}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <Avatar className="w-20 h-20">
                      <AvatarFallback
                        className={`text-3xl font-bold ${getAvatarColor(member.avatarColor)}`}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 w-full">
                      <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {member.name}
                      </h3>
                      {primaryInstrument && (
                        <Badge variant="secondary" className="mt-1.5 text-xs">
                          <span className="mr-1">
                            {INSTRUMENT_ICONS[primaryInstrument] || INSTRUMENT_ICONS['default']}
                          </span>
                          {primaryInstrument}
                        </Badge>
                      )}
                      <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                        <Music size={12} />
                        <span className="font-mono tabular-nums">{songCount}</span> song{songCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Detail View (Gig Sheet) or Band Overview */}
          {selectedMember ? (
            <Card className="flex-1 min-h-0 flex flex-col overflow-hidden animate-slide-in-from-bottom">
              <CardHeader className="flex-shrink-0 border-b border-border bg-muted/30 flex flex-row items-center justify-between space-y-0 p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback
                      className={`text-xl font-bold ${getAvatarColor(selectedMember.avatarColor)}`}
                    >
                      {selectedMember.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl font-serif">{selectedMember.name}&apos;s Gig Sheet</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span><span className="font-mono tabular-nums">{memberSongs.length}</span> Songs Assigned</span>
                      {getMemberInstruments(selectedMember, songs).length > 0 && (
                        <>
                          <span className="text-border">|</span>
                          <span className="flex flex-wrap gap-1">
                            {getMemberInstruments(selectedMember, songs).slice(0, 3).map((inst, i) => (
                              <span key={inst} className="text-xs">
                                {INSTRUMENT_ICONS[inst] || INSTRUMENT_ICONS['default']}
                                {i < Math.min(getMemberInstruments(selectedMember, songs).length - 1, 2) && ', '}
                              </span>
                            ))}
                            {getMemberInstruments(selectedMember, songs).length > 3 && (
                              <span className="text-xs">+{getMemberInstruments(selectedMember, songs).length - 3}</span>
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseMemberDetails}
                  aria-label="Close member details"
                >
                  <X size={20} />
                </Button>
              </CardHeader>

              <CardContent className="flex-1 min-h-0 overflow-y-auto p-6">
                {memberSongs.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <Music size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No songs assigned yet.</p>
                    <p className="text-sm">
                      Go to a song page to assign roles to {selectedMember.name}.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {memberSongs.map(song => {
                      const roles = song.assignments.filter(a => a.memberId === selectedMember.id);
                      const parts = (song.parts || []).filter(
                        p => p.assignedToMemberId === selectedMember.id
                      );

                      return (
                        <Card
                          key={song.id}
                          className="flex flex-col gap-4 hover:border-border/80 transition-colors"
                        >
                          <CardContent className="p-5 flex flex-col gap-4">
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-foreground text-lg truncate">{song.title}</h4>
                                <p className="text-muted-foreground text-sm">
                                  {song.key} • <span className="font-mono tabular-nums">{song.bpm}</span> BPM
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  onClick={() => navigate(getPracticeRoute(song.id))}
                                  className="gap-1 h-7 px-2.5 text-xs"
                                  aria-label={`Practice ${song.title}`}
                                >
                                  <Play size={12} />
                                  Practice
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => onNavigateToSong(song.id)}
                                  aria-label={`Go to ${song.title}`}
                                >
                                  <ArrowRight size={14} />
                                </Button>
                              </div>
                            </div>

                            {/* Roles */}
                            <div className="flex flex-wrap gap-2">
                              {roles.map(r => (
                                <Badge
                                  key={`${song.id}-${r.role}`}
                                  variant="secondary"
                                  className="bg-primary/20 text-primary border border-primary/30"
                                >
                                  <span className="mr-1.5">
                                    {INSTRUMENT_ICONS[r.role] || INSTRUMENT_ICONS['default']}
                                  </span>
                                  {r.role}
                                </Badge>
                              ))}
                            </div>

                            {/* Specific Parts */}
                            {parts.length > 0 && (
                              <div className="mt-2 pt-3 border-t border-border">
                                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">
                                  Special Parts
                                </p>
                                <div className="space-y-1">
                                  {parts.map(part => (
                                    <div
                                      key={part.id}
                                      className="text-sm text-foreground flex items-center gap-2"
                                    >
                                      <span className="w-1.5 h-1.5 bg-info rounded-full" />
                                      {part.name}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Band Overview Card - shown when no member is selected */
            <Card className="flex-1 min-h-0 flex flex-col animate-slide-in-from-bottom">
              <CardHeader className="flex-shrink-0 border-b border-border bg-muted/30 p-6">
                <CardTitle className="text-xl font-serif">Band Overview</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-y-auto p-6">
                {/* Readiness Breakdown */}
                <div className="mb-8">
                  <h3 className="text-lg font-serif text-foreground mb-4">Repertoire Readiness</h3>
                  {songs.length === 0 ? (
                    <p className="text-muted-foreground">No songs in the repertoire yet.</p>
                  ) : (
                    <>
                      {/* Progress Bar */}
                      <TooltipProvider delayDuration={100}>
                        <div className="h-3 bg-muted rounded-full overflow-hidden flex mb-4">
                          {readinessStats.ready > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  tabIndex={0}
                                  role="img"
                                  aria-label={`${readinessStats.ready} songs stage ready`}
                                  className="h-full bg-success transition-all duration-500 animate-progress-fill cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                                  style={{
                                    width: `${(readinessStats.ready / readinessStats.total) * 100}%`,
                                  }}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{readinessStats.ready} Performance Ready</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {readinessStats.inProgress > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  tabIndex={0}
                                  role="img"
                                  aria-label={`${readinessStats.inProgress} songs in progress`}
                                  className="h-full bg-info transition-all duration-500 cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
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
                                  tabIndex={0}
                                  role="img"
                                  aria-label={`${readinessStats.toLearn} songs to learn`}
                                  className="h-full bg-warning transition-all duration-500 cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
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
                        </div>
                      </TooltipProvider>

                      {/* Legend */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-success" />
                          <span className="text-muted-foreground">
                            <span className="font-mono tabular-nums text-foreground">{readinessStats.ready}</span> Ready
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-info" />
                          <span className="text-muted-foreground">
                            <span className="font-mono tabular-nums text-foreground">{readinessStats.inProgress}</span> In Progress
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-warning" />
                          <span className="text-muted-foreground">
                            <span className="font-mono tabular-nums text-foreground">{readinessStats.toLearn}</span> To Learn
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Coverage Warning */}
                {unassignedCount > 0 && (
                  <div className="mb-8 p-4 rounded-lg bg-warning/10 border border-warning/30">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">
                          <span className="font-mono tabular-nums">{unassignedCount}</span> song{unassignedCount !== 1 ? 's need' : ' needs'} assignments
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Select a member above, then go to the song detail pages to assign roles.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Links */}
                <div>
                  <h3 className="text-lg font-serif text-foreground mb-4">Quick Actions</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={handleNavigateToDashboard} className="gap-2">
                      <ArrowRight size={16} />
                      Go to Dashboard
                    </Button>
                    <Button variant="outline" onClick={handleNavigateToSchedule} className="gap-2">
                      <ArrowRight size={16} />
                      View Schedule
                    </Button>
                  </div>
                </div>

                {/* Member Coverage Summary */}
                {members.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-border">
                    <h3 className="text-lg font-serif text-foreground mb-4">Member Coverage</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Click on a member above to see their personalized gig sheet.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {members.map(member => {
                        const songCount = filterMemberSongs(songs, member.id).length;
                        return (
                          <button
                            key={member.id}
                            onClick={() => handleSelectMember(member.id)}
                            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-colors text-left"
                          >
                            <Avatar className="w-8 h-8">
                              <AvatarFallback
                                className={`text-sm font-bold ${getAvatarColor(member.avatarColor)}`}
                              >
                                {member.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground text-sm truncate">{member.name}</p>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-mono tabular-nums">{songCount}</span> song{songCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
});

BandDashboard.displayName = 'BandDashboard';
