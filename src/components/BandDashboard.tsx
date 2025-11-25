import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BandMember, Song } from '../types';
import { Music, ArrowRight, X, Users } from 'lucide-react';
import { INSTRUMENT_ICONS } from '../constants';
import { EmptyState } from './ui/EmptyState';

interface BandDashboardProps {
  members: BandMember[];
  songs: Song[];
  onNavigateToSong: (songId: string) => void;
}

export const BandDashboard: React.FC<BandDashboardProps> = ({
  members,
  songs,
  onNavigateToSong,
}) => {
  const navigate = useNavigate();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const selectedMember = members.find(m => m.id === selectedMemberId);

  // Filter songs where this member has at least one assignment OR one part assigned
  const memberSongs = selectedMemberId
    ? songs.filter(
        song =>
          song.assignments.some(a => a.memberId === selectedMemberId) ||
          (song.parts && song.parts.some(p => p.assignedToMemberId === selectedMemberId))
      )
    : [];

  return (
    <div className="p-6 lg:p-10 h-full flex flex-col">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white">Band Lineup</h2>
        <p className="text-zinc-400 mt-1">View individual gig sheets and responsibilities</p>
      </header>

      {/* Grid of Members */}
      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No band members"
          description="Add members in Settings to start tracking assignments and responsibilities."
          action={{
            label: "Go to Settings",
            onClick: () => navigate('/settings'),
          }}
        />
      ) : (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {members.map(member => (
          <div
            key={member.id}
            onClick={() => setSelectedMemberId(member.id)}
            className={`
                    relative overflow-hidden rounded-2xl border p-6 cursor-pointer transition-all duration-200 group
                    ${
                      selectedMemberId === member.id
                        ? 'bg-zinc-800 border-amber-500 ring-1 ring-amber-500 shadow-xl shadow-amber-900/10'
                        : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'
                    }
                `}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div
                className={`w-20 h-20 rounded-full ${member.avatarColor || 'bg-zinc-700'} flex items-center justify-center text-3xl font-bold text-white shadow-inner`}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-amber-500 transition-colors">
                  {member.name}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {/* Count total assignments */}
                  {songs.reduce(
                    (acc, song) =>
                      acc + song.assignments.filter(a => a.memberId === member.id).length,
                    0
                  )}{' '}
                  Active Roles
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Detail View (Gig Sheet) */}
      {selectedMember ? (
        <div className="flex-1 bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="p-6 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-full ${selectedMember.avatarColor} flex items-center justify-center text-xl font-bold text-white`}
              >
                {selectedMember.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {selectedMember.name}&apos;s Gig Sheet
                </h3>
                <p className="text-zinc-500 text-sm">{memberSongs.length} Songs Assigned</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedMemberId(null)}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white"
              aria-label="Close member details"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {memberSongs.length === 0 ? (
              <div className="text-center py-20 text-zinc-500">
                <Music size={48} className="mx-auto mb-4 opacity-50" />
                <p>No songs assigned yet.</p>
                <p className="text-sm">
                  Go to a song page to assign roles to {selectedMember.name}.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {memberSongs.map(song => {
                  const roles = song.assignments.filter(a => a.memberId === selectedMember.id);
                  const parts = (song.parts || []).filter(
                    p => p.assignedToMemberId === selectedMember.id
                  );

                  return (
                    <div
                      key={song.id}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-zinc-100 text-lg">{song.title}</h4>
                          <p className="text-zinc-500 text-sm">
                            {song.key} • {song.bpm} BPM
                          </p>
                        </div>
                        <button
                          onClick={() => onNavigateToSong(song.id)}
                          className="p-1.5 bg-zinc-900 text-zinc-500 hover:text-white rounded border border-zinc-800"
                          title="Go to Song"
                        >
                          <ArrowRight size={16} />
                        </button>
                      </div>

                      {/* Roles */}
                      <div className="flex flex-wrap gap-2">
                        {roles.map((r, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-900/30 text-amber-500 border border-amber-900/50 rounded-md text-xs font-bold"
                          >
                            <span>{INSTRUMENT_ICONS[r.role] || INSTRUMENT_ICONS['default']}</span>
                            {r.role}
                          </span>
                        ))}
                      </div>

                      {/* Specific Parts */}
                      {parts.length > 0 && (
                        <div className="mt-2 pt-3 border-t border-zinc-900">
                          <p className="text-xs font-bold text-zinc-500 uppercase mb-2">
                            Special Parts
                          </p>
                          <div className="space-y-1">
                            {parts.map(part => (
                              <div
                                key={part.id}
                                className="text-sm text-zinc-300 flex items-center gap-2"
                              >
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                {part.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-600">
          <p>Select a band member above to view their personalized setlist.</p>
        </div>
      )}
    </div>
  );
};
