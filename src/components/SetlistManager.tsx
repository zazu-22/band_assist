import React, { memo, useState, useCallback, useMemo } from 'react';
import { Music } from 'lucide-react';
import { toast, EmptyState, ConfirmDialog } from '@/components/ui';
import { StorageService } from '@/services/storageService';
import { parseLocalDate, getLocalToday, daysBetween } from '@/lib/dateUtils';
import { useTouchSortable } from '@/hooks/useTouchSortable';
import {
  SetlistHeader,
  SetlistStats,
  SetlistItem,
  SetlistActionBar,
  AddSongForm,
} from '@/components/setlist';
import type { Song, BandEvent } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

interface SetlistManagerProps {
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  onSelectSong: (songId: string) => void;
  /** Optional events for gig countdown context */
  events?: BandEvent[];
  /** Whether the current user is a band admin */
  isAdmin?: boolean;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Calculate total duration in seconds from array of songs
 */
function calculateTotalDuration(songs: Song[]): number {
  return songs.reduce((acc, song) => {
    if (!song.duration.includes(':')) return acc;
    const [min, sec] = song.duration.split(':').map(Number);
    return acc + min * 60 + (sec || 0);
  }, 0);
}

/**
 * Format seconds to human-readable duration string
 */
function formatTotalTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}


// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * SetlistManager - Main setlist builder component
 *
 * Refactored to use sub-components following the "Backstage Command Center"
 * design system patterns from the Dashboard and Practice Room.
 *
 * Design System Features:
 * - Brawler serif typography for headlines
 * - JetBrains Mono for numbers and durations
 * - Staggered entrance animations
 * - Gig countdown context (when events available)
 * - Segmented progress bar for readiness metrics
 * - Ambient background glow
 */
export const SetlistManager: React.FC<SetlistManagerProps> = memo(function SetlistManager({
  songs,
  setSongs,
  onSelectSong,
  events = [],
  isAdmin = false,
}) {
  const [isAdding, setIsAdding] = useState(false);

  // Delete confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    songId: string;
  }>({ isOpen: false, songId: '' });

  // Memoize total duration calculation
  const totalDurationSeconds = useMemo(() => calculateTotalDuration(songs), [songs]);

  // Compute next gig from events
  const { nextGig, daysUntilNextGig } = useMemo(() => {
    const today = getLocalToday();

    const upcoming = events
      .filter(e => e.type === 'GIG' && parseLocalDate(e.date) >= today)
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());

    const next = upcoming[0];
    if (!next) {
      return { nextGig: undefined, daysUntilNextGig: undefined };
    }

    const days = daysBetween(today, parseLocalDate(next.date));

    return { nextGig: next, daysUntilNextGig: days };
  }, [events]);

  // --- Add Song Handlers ---

  const handleAddSong = useCallback(
    (title: string) => {
      const newSong: Song = {
        id: crypto.randomUUID(),
        title,
        artist: 'ZZ Top',
        duration: '3:30',
        bpm: 120,
        key: 'E',
        isOriginal: false,
        status: 'To Learn',
        assignments: [],
        parts: [],
        charts: [],
      };

      setSongs(prev => [...prev, newSong]);
      setIsAdding(false);
    },
    [setSongs]
  );

  const handleStartAdding = useCallback(() => {
    setIsAdding(true);
  }, []);

  const handleCancelAdding = useCallback(() => {
    setIsAdding(false);
  }, []);

  // --- Touch/Mouse/Keyboard Sortable ---

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newSongs = [...songs];
      const [movedSong] = newSongs.splice(fromIndex, 1);
      newSongs.splice(toIndex, 0, movedSong);

      // Update sortOrder for all songs to persist ordering
      const songsWithOrder = newSongs.map((song, idx) => ({
        ...song,
        sortOrder: idx,
      }));

      setSongs(songsWithOrder);
    },
    [songs, setSongs]
  );

  const { dragState, getItemProps, getDragHandleProps, getTransformStyle, liveRegionProps, announcement } =
    useTouchSortable({
      items: songs,
      onReorder: handleReorder,
    });

  const handleDeleteSong = useCallback((songId: string) => {
    setConfirmDialog({ isOpen: true, songId });
  }, []);

  // Derive song title from current songs array to avoid stale closures
  const songToDelete = songs.find(s => s.id === confirmDialog.songId);
  const songTitleToDelete = songToDelete?.title || 'this song';

  const confirmDeleteSong = useCallback(async () => {
    const songId = confirmDialog.songId;
    setConfirmDialog({ isOpen: false, songId: '' });

    try {
      // Delete from Supabase first
      await StorageService.deleteSong(songId);
      // Then update local state
      setSongs(prev => prev.filter(s => s.id !== songId));
      toast.success('Song deleted successfully');
    } catch (error) {
      console.error('Error deleting song:', error);
      toast.error('Failed to delete song. Please try again.');
    }
  }, [confirmDialog.songId, setSongs]);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog({ isOpen: false, songId: '' });
  }, []);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="relative p-4 sm:p-6 lg:p-10 space-y-8">
      {/* Ambient background glow - fixed size to maintain consistent fade on all viewports */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{
            background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Header */}
      <SetlistHeader
        songCount={songs.length}
        totalDuration={formatTotalTime(totalDurationSeconds)}
        nextGig={nextGig}
        daysUntilNextGig={daysUntilNextGig}
      />

      {/* Stats Card - only show when songs exist */}
      {songs.length > 0 && (
        <div className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-1">
          <SetlistStats songs={songs} />
        </div>
      )}

      {/* Action Bar */}
      <div className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-2">
        <SetlistActionBar onAddSong={handleStartAdding} />
      </div>

      {/* Add Song Form (conditional) */}
      {isAdding && <AddSongForm onSubmit={handleAddSong} onCancel={handleCancelAdding} />}

      {/* Song List */}
      <div className="space-y-0">
        {songs.length === 0 ? (
          <EmptyState
            icon={Music}
            title="No songs in setlist"
            description="Add your first song to start building your setlist and organizing your performance."
            action={{
              label: 'Add Song',
              onClick: handleStartAdding,
            }}
          />
        ) : (
          <>
            <ul className="space-y-3 pb-20" role="list" aria-label="Setlist songs">
              {songs.map((song, index) => {
                const itemProps = getItemProps(index);
                const dragHandleProps = getDragHandleProps(index);
                const transformStyle = getTransformStyle(index);
                const isDragging = dragState.isDragging && dragState.draggedIndex === index;
                const isDropTarget =
                  dragState.isDragging &&
                  dragState.targetIndex === index &&
                  dragState.draggedIndex !== index;

                return (
                  <SetlistItem
                    key={song.id}
                    song={song}
                    index={index}
                    isDragging={isDragging}
                    isDropTarget={isDropTarget}
                    transformStyle={transformStyle}
                    itemRef={itemProps.ref}
                    dragHandleProps={dragHandleProps}
                    itemProps={{
                      onKeyDown: itemProps.onKeyDown,
                      tabIndex: itemProps.tabIndex,
                      role: itemProps.role,
                      'aria-grabbed': itemProps['aria-grabbed'],
                      'aria-dropeffect': itemProps['aria-dropeffect'],
                    }}
                    onSelect={onSelectSong}
                    onDelete={handleDeleteSong}
                    isAdmin={isAdmin}
                  />
                );
              })}
            </ul>
            {/* Screen reader announcements */}
            <div {...liveRegionProps}>{announcement}</div>
          </>
        )}
      </div>

      {/* Delete Song Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Song"
        message={`Are you sure you want to delete "${songTitleToDelete}"? This will permanently remove the song along with all its charts, assignments, and backing tracks.`}
        variant="danger"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteSong}
        onCancel={closeConfirmDialog}
      />
    </div>
  );
});

SetlistManager.displayName = 'SetlistManager';
