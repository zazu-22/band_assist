import React, { memo, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, ArrowRight, X, Users } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Avatar,
  AvatarFallback,
} from '@/components/primitives';
import { EmptyState } from '@/components/ui';
import { INSTRUMENT_ICONS } from '@/constants';
import { getAvatarColor } from '@/lib/avatar';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/routes';
import type { BandMember, Song } from '@/types';

interface BandDashboardProps {
  members: BandMember[];
  songs: Song[];
  onNavigateToSong: (songId: string) => void;
}

/**
 * Get count of active roles for a member across all songs
 */
function getMemberRoleCount(songs: Song[], memberId: string): number {
  return songs.reduce(
    (acc, song) => acc + song.assignments.filter(a => a.memberId === memberId).length,
    0
  );
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

  const handleSelectMember = useCallback((memberId: string) => {
    setSelectedMemberId(memberId);
  }, []);

  const handleCloseMemberDetails = useCallback(() => {
    setSelectedMemberId(null);
  }, []);

  const handleNavigateToSettings = useCallback(() => {
    navigate(ROUTES.SETTINGS);
  }, [navigate]);

  return (
    <div className="relative p-4 sm:p-6 lg:p-10 h-full flex flex-col">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }}
        />
      </div>

      <header className="mb-8">
        <h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">Band Lineup</h2>
        <p className="text-muted-foreground mt-1">
          View individual gig sheets and responsibilities
        </p>
      </header>

      {/* Grid of Members */}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {members.map((member, index) => {
            const isSelected = selectedMemberId === member.id;
            const roleCount = getMemberRoleCount(songs, member.id);

            return (
              <Card
                key={member.id}
                className={cn(
                  'relative overflow-hidden cursor-pointer transition-all duration-200 group',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  'animate-slide-in-from-bottom animation-forwards opacity-0',
                  isSelected
                    ? 'ring-2 ring-primary shadow-lg border-l-[3px] border-l-primary'
                    : 'hover:bg-muted/50 hover:border-border/80'
                )}
                style={{ animationDelay: `${index * 75}ms` }}
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
                aria-label={`Select ${member.name} - ${roleCount} active role${roleCount !== 1 ? 's' : ''}`}
              >
                <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarFallback
                      className={`text-3xl font-bold ${getAvatarColor(member.avatarColor)}`}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {member.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-mono tabular-nums">{roleCount}</span> Active Role{roleCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail View (Gig Sheet) */}
      {selectedMember ? (
        <Card className="flex-1 flex flex-col overflow-hidden animate-slide-in-from-bottom">
          <CardHeader className="border-b border-border bg-muted/30 flex flex-row items-center justify-between space-y-0 p-6">
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
                <p className="text-muted-foreground text-sm"><span className="font-mono tabular-nums">{memberSongs.length}</span> Songs Assigned</p>
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

          <CardContent className="flex-1 overflow-y-auto p-6">
            {memberSongs.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
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
                    <Card
                      key={song.id}
                      className="flex flex-col gap-4 hover:border-border/80 transition-colors"
                    >
                      <CardContent className="p-5 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-foreground text-lg">{song.title}</h4>
                            <p className="text-muted-foreground text-sm">
                              {song.key} • <span className="font-mono tabular-nums">{song.bpm}</span> BPM
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onNavigateToSong(song.id)}
                            aria-label={`Go to ${song.title}`}
                          >
                            <ArrowRight size={16} />
                          </Button>
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
        <Card className="flex-1 flex items-center justify-center border-2 border-dashed">
          <p className="text-muted-foreground">
            Select a band member above to view their personalized setlist.
          </p>
        </Card>
      )}
    </div>
  );
});

BandDashboard.displayName = 'BandDashboard';
