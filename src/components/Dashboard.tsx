import React, { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, CalendarDays, CheckCircle2, Disc, Music } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/primitives';
import { EmptyState, StatCard, StatusBadge } from '@/components/ui';
import { ROUTES } from '@/routes';
import type { Song, BandEvent } from '@/types';

interface DashboardProps {
  songs: Song[];
  onNavigateToSong: (songId: string) => void;
  events?: BandEvent[];
}

/**
 * Format date for gig display
 */
function formatGigDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Build subtitle string for next gig (date + location)
 */
function buildGigSubtitle(gig: BandEvent): string {
  const dateStr = formatGigDate(gig.date);
  return gig.location ? `${dateStr} • ${gig.location}` : dateStr;
}

export const Dashboard: React.FC<DashboardProps> = memo(function Dashboard({
  songs,
  onNavigateToSong,
  events = [],
}) {
  const navigate = useNavigate();

  // Memoize computed stats to avoid recalculating on every render
  const stats = useMemo(() => {
    const readySongs = songs.filter(s => s.status === 'Performance Ready').length;
    const learningSongs = songs.filter(s => s.status === 'To Learn').length;
    return { total: songs.length, ready: readySongs, learning: learningSongs };
  }, [songs]);

  // Memoize next gig calculation
  const nextGig = useMemo(() => {
    const today = new Date();
    return events
      .filter(e => e.type === 'GIG' && new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  }, [events]);

  // Memoize the displayed songs list (first 5)
  const displayedSongs = useMemo(() => songs.slice(0, 5), [songs]);

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-8">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-foreground">Band Overview</h2>
        <p className="text-muted-foreground mt-1">Road to the next gig</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Setlist"
          value={stats.total}
          subtitle="Songs"
          icon={Disc}
        />
        <StatCard
          title="Stage Ready"
          value={stats.ready}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="To Learn"
          value={stats.learning}
          icon={Activity}
          variant="warning"
        />
        <StatCard
          title="Next Gig"
          value={nextGig ? nextGig.title : 'No gigs set'}
          subtitle={nextGig ? buildGigSubtitle(nextGig) : undefined}
          icon={CalendarDays}
          variant="info"
        />
      </div>

      {/* Recent Activity / Quick Access */}
      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Setlist Progress */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Setlist Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {songs.length === 0 ? (
              <EmptyState
                icon={Music}
                title="No songs yet"
                description="Add your first song to start building your setlist and tracking progress."
                action={{
                  label: 'Add Song',
                  onClick: () => navigate(ROUTES.SETLIST),
                }}
              />
            ) : (
              <div className="space-y-3">
                {displayedSongs.map(song => (
                  <button
                    key={song.id}
                    type="button"
                    onClick={() => onNavigateToSong(song.id)}
                    className="flex w-full items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors border border-border/50 hover:border-border text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {song.bpm || '—'}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{song.title}</p>
                        <p className="text-sm text-muted-foreground">{song.artist}</p>
                      </div>
                    </div>
                    <StatusBadge status={song.status} />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billy's Wisdom */}
        <Card className="bg-gradient-to-br from-card to-muted border-border relative overflow-hidden">
          <CardContent className="p-6 relative z-10">
            <h3 className="text-xl font-bold text-foreground mb-2">Billy&apos;s Wisdom</h3>
            <p className="text-muted-foreground italic mb-6">
              &quot;You can&apos;t lose with the blues.&quot;
            </p>
            <div className="bg-background/30 p-4 rounded-xl backdrop-blur-sm border border-border/50">
              <p className="text-sm text-muted-foreground font-mono">
                Daily Tip: When playing La Grange, keep that right hand loose for the shuffle.
                It&apos;s all in the wrist.
              </p>
            </div>
          </CardContent>
          {/* Decorative Texture */}
          <div
            className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary rounded-full blur-[80px] opacity-20"
            aria-hidden="true"
          />
        </Card>
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';
