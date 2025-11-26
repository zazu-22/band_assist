import React, { memo, useState, useCallback, useMemo } from 'react';
import { GripVertical, Plus, Clock, Trash2, Music, Sparkles } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@/components/primitives';
import { toast, EmptyState, StatusBadge } from '@/components/ui';
import { getMusicAnalysis } from '@/services/geminiService';
import type { Song } from '@/types';

interface SetlistManagerProps {
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  onSelectSong: (songId: string) => void;
}

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

export const SetlistManager: React.FC<SetlistManagerProps> = memo(function SetlistManager({
  songs,
  setSongs,
  onSelectSong,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // DnD State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Memoize total duration calculation
  const totalDurationSeconds = useMemo(() => calculateTotalDuration(songs), [songs]);

  const handleAddSong = useCallback(() => {
    if (!newSongTitle.trim()) return;

    const newSong: Song = {
      id: crypto.randomUUID(),
      title: newSongTitle,
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
    setNewSongTitle('');
    setIsAdding(false);
  }, [newSongTitle, setSongs]);

  const askAiForSuggestions = useCallback(async () => {
    setLoadingSuggestion(true);
    const prompt = `Suggest 3 ZZ Top songs that would fit well in a setlist that already has: ${songs.map(s => s.title).join(', ')}. Just list the titles.`;
    const suggestion = await getMusicAnalysis(prompt);
    toast.info(suggestion, { duration: 10000 });
    setLoadingSuggestion(false);
  }, [songs]);

  // --- Drag and Drop Handlers ---

  const handleDragStart = useCallback((e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      setDraggedIndex(index);
    }, 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex === null) return;
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedIndex, dragOverIndex]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLElement>) => {
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
  }, [draggedIndex, dragOverIndex, songs, setSongs, handleDragEnd]);

  const handleDeleteSong = useCallback((songId: string) => {
    setSongs(prev => prev.filter(s => s.id !== songId));
  }, [setSongs]);

  const handleStartAdding = useCallback(() => {
    setIsAdding(true);
  }, []);

  const handleCancelAdding = useCallback(() => {
    setIsAdding(false);
    setNewSongTitle('');
  }, []);

  // Component for the drop placeholder
  const DropIndicator = ({ index }: { index: number }) => (
    <div
      onDragOver={e => handleDragOver(e, index)}
      onDrop={handleDrop}
      className="h-20 mb-3 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 flex items-center justify-center animate-fade-in"
    >
      <span className="text-primary/50 text-sm font-bold uppercase tracking-widest pointer-events-none">
        Drop Here
      </span>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Setlist Builder</h2>
          <div className="flex items-center gap-2 mt-2 text-muted-foreground">
            <Clock size={16} />
            <span>Est. Run Time: {formatTotalTime(totalDurationSeconds)}</span>
            <span className="mx-2">•</span>
            <span>{songs.length} Songs</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={askAiForSuggestions}
            disabled={loadingSuggestion}
          >
            <Sparkles size={16} />
            {loadingSuggestion ? 'Thinking...' : 'AI Suggestions'}
          </Button>
          <Button onClick={handleStartAdding}>
            <Plus size={18} />
            Add Song
          </Button>
        </div>
      </div>

      {isAdding && (
        <Card className="mb-6 animate-slide-in-from-top">
          <CardContent className="pt-6">
            <label htmlFor="new-song-title" className="block text-sm font-medium text-muted-foreground mb-2">
              Song Title
            </label>
            <div className="flex gap-3">
              <Input
                id="new-song-title"
                type="text"
                value={newSongTitle}
                onChange={e => setNewSongTitle(e.target.value)}
                placeholder="e.g., Legs"
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && handleAddSong()}
                autoFocus
              />
              <Button onClick={handleAddSong}>
                Add
              </Button>
              <Button variant="ghost" onClick={handleCancelAdding}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                  {showPlaceholderBefore && <DropIndicator index={index} />}

                  <li
                    draggable
                    onDragStart={e => handleDragStart(e, index)}
                    onDragOver={e => handleDragOver(e, index)}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    className={`
                      group flex items-center gap-4 p-4 bg-card rounded-xl border border-border
                      hover:border-border/80 transition-all duration-200 w-full
                      ${isDragged ? 'opacity-0 h-0 p-0 border-0 my-0 overflow-hidden' : 'opacity-100 shadow-sm'}
                    `}
                  >
                    <div
                      className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-2 touch-none"
                      aria-label="Drag to reorder"
                    >
                      <GripVertical size={20} />
                    </div>
                    <div className="w-8 text-center font-mono text-muted-foreground text-sm select-none">
                      {index + 1}
                    </div>
                    <button
                      type="button"
                      className="flex-1 text-left cursor-pointer"
                      onClick={() => onSelectSong(song.id)}
                    >
                      <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {song.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {song.key} • {song.bpm} BPM
                      </p>
                    </button>
                    <div className="hidden md:block text-sm font-mono text-muted-foreground px-4 select-none">
                      {song.duration}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={song.status} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteSong(song.id);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${song.title}`}
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </li>

                  {/* Conditional Placeholder Below */}
                  {showPlaceholderAfter && <DropIndicator index={index} />}
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
