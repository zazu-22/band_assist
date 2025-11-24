import React, { useState } from 'react';
import { Song } from '../types';
import { GripVertical, Plus, Clock, Trash2 } from 'lucide-react';
import { getMusicAnalysis } from '../services/geminiService';

interface SetlistManagerProps {
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  onSelectSong: (songId: string) => void;
}

export const SetlistManager: React.FC<SetlistManagerProps> = ({
  songs,
  setSongs,
  onSelectSong,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // DnD State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const totalDurationSeconds = songs.reduce((acc, song) => {
    if (!song.duration.includes(':')) return acc;
    const [min, sec] = song.duration.split(':').map(Number);
    return acc + min * 60 + (sec || 0);
  }, 0);

  const formatTotalTime = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const handleAddSong = async () => {
    if (!newSongTitle.trim()) return;

    const newSong: Song = {
      id: Date.now().toString(),
      title: newSongTitle,
      artist: 'ZZ Top',
      duration: '3:30', // Default placeholder
      bpm: 120,
      key: 'E',
      isOriginal: false,
      status: 'To Learn',
      assignments: [],
      parts: [],
      charts: [],
    };

    setSongs([...songs, newSong]);
    setNewSongTitle('');
    setIsAdding(false);
  };

  const askAiForSuggestions = async () => {
    setLoadingSuggestion(true);
    const prompt = `Suggest 3 ZZ Top songs that would fit well in a setlist that already has: ${songs.map(s => s.title).join(', ')}. Just list the titles.`;
    const suggestion = await getMusicAnalysis(prompt);
    alert(suggestion); // Simple alert for demo
    setLoadingSuggestion(false);
  };

  // --- Drag and Drop Handlers ---

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      setDraggedIndex(index);
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex === null) return;
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
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
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Component for the drop placeholder
  const DropIndicator = ({ index }: { index: number }) => (
    <div
      onDragOver={e => handleDragOver(e, index)}
      onDrop={handleDrop}
      className="h-20 mb-3 rounded-xl border-2 border-dashed border-amber-500/50 bg-amber-500/5 flex items-center justify-center animate-in fade-in zoom-in duration-200"
    >
      <span className="text-amber-500/50 text-sm font-bold uppercase tracking-widest pointer-events-none">
        Drop Here
      </span>
    </div>
  );

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Setlist Builder</h2>
          <div className="flex items-center gap-2 mt-2 text-zinc-400">
            <Clock size={16} />
            <span>Est. Run Time: {formatTotalTime(totalDurationSeconds)}</span>
            <span className="mx-2">•</span>
            <span>{songs.length} Songs</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={askAiForSuggestions}
            disabled={loadingSuggestion}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors border border-zinc-700"
          >
            {loadingSuggestion ? 'Thinking...' : '✨ AI Suggestions'}
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-amber-900/20"
          >
            <Plus size={18} />
            Add Song
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="mb-6 bg-zinc-900 p-4 rounded-xl border border-zinc-700 animate-in fade-in slide-in-from-top-4">
          <label className="block text-sm font-medium text-zinc-400 mb-1">Song Title</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={newSongTitle}
              onChange={e => setNewSongTitle(e.target.value)}
              placeholder="e.g., Legs"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              onKeyDown={e => e.key === 'Enter' && handleAddSong()}
            />
            <button
              onClick={handleAddSong}
              className="px-4 py-2 bg-zinc-100 text-zinc-900 font-bold rounded-lg"
            >
              Add
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-0">
        {songs.length === 0 ? (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-12 text-center text-zinc-500">
            <p>No songs in the setlist yet.</p>
          </div>
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
                            group flex items-center gap-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800 
                            hover:border-zinc-600 transition-all duration-200 w-full
                            ${isDragged ? 'opacity-0 h-0 p-0 border-0 my-0 overflow-hidden' : 'opacity-100 shadow-lg'}
                        `}
                  >
                    <div className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 p-2 touch-none">
                      <GripVertical size={20} />
                    </div>
                    <div className="w-8 text-center font-mono text-zinc-500 text-sm select-none">
                      {index + 1}
                    </div>
                    <div className="flex-1 cursor-pointer" onClick={() => onSelectSong(song.id)}>
                      <h4 className="font-bold text-zinc-100 group-hover:text-amber-500 transition-colors">
                        {song.title}
                      </h4>
                      <p className="text-xs text-zinc-500">
                        {song.key} • {song.bpm} BPM
                      </p>
                    </div>
                    <div className="hidden md:block text-sm font-mono text-zinc-400 px-4 select-none">
                      {song.duration}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase px-2 py-0.5 rounded border select-none ${
                          song.status === 'Performance Ready'
                            ? 'border-green-800 text-green-500'
                            : song.status === 'In Progress'
                              ? 'border-blue-800 text-blue-500'
                              : 'border-zinc-700 text-zinc-500'
                        }`}
                      >
                        {song.status === 'Performance Ready' ? 'Ready' : 'WIP'}
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          const newSongs = songs.filter(s => s.id !== song.id);
                          setSongs(newSongs);
                        }}
                        className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
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
};
