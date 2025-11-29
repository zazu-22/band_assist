import React, { memo, useState, useCallback, useMemo } from 'react';
import { Music } from 'lucide-react';
import { toast, EmptyState } from '@/components/ui';
import { getMusicAnalysis } from '@/services/geminiService';
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
// DROP INDICATOR COMPONENT
// =============================================================================

interface DropIndicatorProps {
  index: number;
  onDragOver: (e: React.DragEvent<HTMLElement>, index: number) => void;
  onDrop: (e: React.DragEvent<HTMLElement>) => void;
}

const DropIndicator = memo(function DropIndicator({
  index,
  onDragOver,
  onDrop,
}: DropIndicatorProps) {
  return (
    <div
      onDragOver={e => onDragOver(e, index)}
      onDrop={onDrop}
      className="h-16 mb-3 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 flex items-center justify-center animate-fade-in"
    >
      <span className="text-primary/60 text-sm font-bold uppercase tracking-widest pointer-events-none">
        Drop Here
      </span>
    </div>
  );
});

DropIndicator.displayName = 'DropIndicator';

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
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // DnD State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Memoize total duration calculation
  const totalDurationSeconds = useMemo(() => calculateTotalDuration(songs), [songs]);

  // Compute next gig from events
  const { nextGig, daysUntilNextGig } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = events
      .filter(e => e.type === 'GIG' && new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const next = upcoming[0];
    if (!next) {
      return { nextGig: undefined, daysUntilNextGig: undefined };
    }

    const gigDate = new Date(next.date);
    gigDate.setHours(0, 0, 0, 0);
    const days = Math.ceil((gigDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

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

  // --- AI Suggestions ---

  const askAiForSuggestions = useCallback(async () => {
    setLoadingSuggestion(true);
    try {
      const prompt = `Suggest 3 ZZ Top songs that would fit well in a setlist that already has: ${songs.map(s => s.title).join(', ')}. Just list the titles.`;
      const suggestion = await getMusicAnalysis(prompt);
      toast.info(suggestion, { duration: 10000 });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[SetlistManager] AI suggestion error:', errorMessage, {
        songCount: songs.length,
      });
      toast.error('Failed to get AI suggestions. Please try again.');
    } finally {
      setLoadingSuggestion(false);
    }
  }, [songs]);

  // --- Drag and Drop Handlers ---

  const handleDragStart = useCallback((e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      setDraggedIndex(index);
    }, 0);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLElement>, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      if (draggedIndex === null) return;
      if (dragOverIndex !== index) {
        setDragOverIndex(index);
      }
    },
    [draggedIndex, dragOverIndex]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();

      if (draggedIndex === null || dragOverIndex === null) {
        handleDragEnd();
        return;
      }

      const newSongs = [...songs];
      const [movedSong] = newSongs.splice(draggedIndex, 1);
      const targetIndex = dragOverIndex;
      newSongs.splice(targetIndex, 0, movedSong);

      // Update sortOrder for all songs to persist ordering
      const songsWithOrder = newSongs.map((song, index) => ({
        ...song,
        sortOrder: index,
      }));

      setSongs(songsWithOrder);
      handleDragEnd();
    },
    [draggedIndex, dragOverIndex, songs, setSongs, handleDragEnd]
  );

  const handleDeleteSong = useCallback(
    (songId: string) => {
      setSongs(prev => prev.filter(s => s.id !== songId));
    },
    [setSongs]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="relative p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      {/* Ambient background glow (same as Dashboard) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-[0.03]"
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
        <SetlistActionBar
          onAddSong={handleStartAdding}
          onAiSuggestions={askAiForSuggestions}
          isLoadingSuggestions={loadingSuggestion}
        />
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
          <ul className="space-y-3 pb-20">
            {songs.map((song, index) => {
              const isDragged = draggedIndex === index;
              const isOver = dragOverIndex === index;

              const showPlaceholderBefore = isOver && draggedIndex !== null && draggedIndex > index;
              const showPlaceholderAfter = isOver && draggedIndex !== null && draggedIndex < index;

              return (
                <React.Fragment key={song.id}>
                  {/* Conditional Placeholder Above */}
                  {showPlaceholderBefore && (
                    <DropIndicator index={index} onDragOver={handleDragOver} onDrop={handleDrop} />
                  )}

                  <SetlistItem
                    song={song}
                    index={index}
                    isDragged={isDragged}
                    onSelect={onSelectSong}
                    onDelete={handleDeleteSong}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                  />

                  {/* Conditional Placeholder Below */}
                  {showPlaceholderAfter && (
                    <DropIndicator index={index} onDragOver={handleDragOver} onDrop={handleDrop} />
                  )}
                </React.Fragment>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
});

SetlistManager.displayName = 'SetlistManager';
