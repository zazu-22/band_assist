import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Song, BandEvent } from '../types';
import { Activity, CalendarDays, CheckCircle2, Disc, Music } from 'lucide-react';
import { EmptyState } from './ui';

interface DashboardProps {
  songs: Song[];
  onNavigateToSong: (songId: string) => void;
  events?: BandEvent[];
}

export const Dashboard: React.FC<DashboardProps> = ({ songs, onNavigateToSong, events = [] }) => {
  const navigate = useNavigate();
  const totalSongs = songs.length;
  const readySongs = songs.filter(s => s.status === 'Performance Ready').length;
  const learningSongs = songs.filter(s => s.status === 'To Learn').length;

  // Find next gig
  const today = new Date();
  const nextGig = events
    .filter(e => e.type === 'GIG' && new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white">Band Overview</h2>
        <p className="text-zinc-400 mt-1">Road to the next gig</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Disc size={64} />
          </div>
          <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">
            Total Setlist
          </p>
          <p className="text-4xl font-bold text-white mt-2">
            {totalSongs} <span className="text-lg text-zinc-500 font-normal">Songs</span>
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle2 size={64} className="text-green-500" />
          </div>
          <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Stage Ready</p>
          <p className="text-4xl font-bold text-green-500 mt-2">{readySongs}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={64} className="text-amber-500" />
          </div>
          <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">To Learn</p>
          <p className="text-4xl font-bold text-amber-500 mt-2">{learningSongs}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CalendarDays size={64} className="text-blue-500" />
          </div>
          <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Next Gig</p>
          {nextGig ? (
            <>
              <p className="text-xl font-bold text-white mt-2 truncate" title={nextGig.title}>
                {nextGig.title}
              </p>
              <p className="text-sm text-zinc-500">
                {new Date(nextGig.date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                {nextGig.location ? `• ${nextGig.location}` : ''}
              </p>
            </>
          ) : (
            <p className="text-xl font-bold text-zinc-500 mt-2">No gigs set</p>
          )}
        </div>
      </div>

      {/* Recent Activity / Quick Access */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Setlist Progress</h3>
          {songs.length === 0 ? (
            <EmptyState
              icon={Music}
              title="No songs yet"
              description="Add your first song to start building your setlist and tracking progress."
              action={{
                label: "Add Song",
                onClick: () => navigate('/setlist'),
              }}
            />
          ) : (
          <div className="space-y-4">
            {songs.slice(0, 5).map(song => (
              <div
                key={song.id}
                onClick={() => onNavigateToSong(song.id)}
                className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-xl hover:bg-zinc-800 cursor-pointer transition-colors border border-zinc-800/50 hover:border-zinc-700"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                    {song.bpm}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{song.title}</p>
                    <p className="text-sm text-zinc-500">{song.artist}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      song.status === 'Performance Ready'
                        ? 'bg-green-950/30 text-green-500 border-green-900'
                        : song.status === 'In Progress'
                          ? 'bg-blue-950/30 text-blue-500 border-blue-900'
                          : 'bg-amber-950/30 text-amber-500 border-amber-900'
                    }`}
                  >
                    {song.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Billy&apos;s Wisdom</h3>
            <p className="text-zinc-300 italic mb-6">
              &quot;You can&apos;t lose with the blues.&quot;
            </p>
            <div className="bg-black/30 p-4 rounded-xl backdrop-blur-sm border border-white/10">
              <p className="text-sm text-zinc-300 font-mono">
                Daily Tip: When playing La Grange, keep that right hand loose for the shuffle.
                It&apos;s all in the wrist.
              </p>
            </div>
          </div>
          {/* Decorative Texture */}
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-600 rounded-full blur-[80px] opacity-20"></div>
        </div>
      </div>
    </div>
  );
};
