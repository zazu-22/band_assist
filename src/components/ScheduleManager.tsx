import React, { useState } from 'react';
import { BandEvent, Song } from '../types';
import { Calendar, Clock, MapPin, Plus, Trash2, Guitar, Star, Edit2 } from 'lucide-react';

interface ScheduleManagerProps {
  events: BandEvent[];
  setEvents: React.Dispatch<React.SetStateAction<BandEvent[]>>;
  songs: Song[];
  onNavigateToSong: (songId: string) => void;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  events,
  setEvents,
  songs,
  onNavigateToSong,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<BandEvent>>({
    type: 'PRACTICE',
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
  });

  const handleSaveEvent = () => {
    if (!newEvent.title || !newEvent.date) return;

    if (editingId) {
      setEvents(events.map(e => (e.id === editingId ? ({ ...e, ...newEvent } as BandEvent) : e)));
    } else {
      const event: BandEvent = {
        id: crypto.randomUUID(),
        title: newEvent.title!,
        date: newEvent.date!,
        time: newEvent.time,
        type: newEvent.type as 'PRACTICE' | 'GIG' | 'OTHER',
        location: newEvent.location,
        notes: newEvent.notes,
      };
      setEvents([...events, event]);
    }
    resetForm();
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewEvent({
      type: 'PRACTICE',
      date: new Date().toISOString().split('T')[0],
      time: '19:00',
    });
  };

  const handleEditEvent = (item: BandEvent) => {
    const { id, title, date, time, type, location, notes } = item;
    setNewEvent({ id, title, date, time, type, location, notes });
    setEditingId(id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteEvent = (id: string) => {
    if (window.confirm('Remove this event?')) {
      setEvents(events.filter(e => e.id !== id));
    }
  };

  // Combine Events and Song Targets into a single timeline
  interface TimelineEventItem extends BandEvent {
    isEvent: true;
  }

  interface TimelineSongItem {
    id: string;
    title: string;
    date: string;
    type: 'DEADLINE';
    data: Song;
    isEvent: false;
  }

  type TimelineItem = TimelineEventItem | TimelineSongItem;

  const songTargets: TimelineSongItem[] = songs
    .filter(s => s.targetDate)
    .map(s => ({
      id: `song-${s.id}`,
      title: `Ready: ${s.title}`,
      date: s.targetDate!,
      type: 'DEADLINE' as const,
      data: s,
      isEvent: false as const,
    }));

  const timelineItems: TimelineItem[] = [
    ...events.map(e => ({ ...e, isEvent: true as const })),
    ...songTargets,
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'PRACTICE':
        return <Guitar className="text-blue-500" />;
      case 'GIG':
        return <Star className="text-amber-500 fill-amber-500" />;
      case 'DEADLINE':
        return <Clock className="text-red-400" />;
      default:
        return <Calendar className="text-zinc-500" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'PRACTICE':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'GIG':
        return 'border-amber-500/50 bg-amber-500/10';
      case 'DEADLINE':
        return 'border-zinc-800 bg-zinc-900/50 dashed border-2';
      default:
        return 'border-zinc-800 bg-zinc-900';
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Band Schedule</h2>
          <p className="text-zinc-400 mt-1">Manage practices, gigs, and song goals</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsAdding(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-amber-900/20"
        >
          <Plus size={18} /> Add Event
        </button>
      </div>

      {isAdding && (
        <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl mb-8 animate-in fade-in slide-in-from-top-4 shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-4">
            {editingId ? 'Edit Event' : 'New Event'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Event Title
              </label>
              <input
                type="text"
                value={newEvent.title || ''}
                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-white outline-none focus:border-amber-500"
                placeholder="e.g. Garage Practice"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Type</label>
              <select
                value={newEvent.type}
                onChange={e =>
                  setNewEvent({ ...newEvent, type: e.target.value as 'PRACTICE' | 'GIG' | 'OTHER' })
                }
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-white outline-none focus:border-amber-500"
              >
                <option value="PRACTICE">Practice</option>
                <option value="GIG">Gig / Performance</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Date</label>
              <input
                type="date"
                value={newEvent.date}
                onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-white outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Time</label>
              <input
                type="time"
                value={newEvent.time}
                onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-white outline-none focus:border-amber-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Location
              </label>
              <input
                type="text"
                value={newEvent.location || ''}
                onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-white outline-none focus:border-amber-500"
                placeholder="e.g. Brother 1's House"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Notes</label>
              <textarea
                value={newEvent.notes || ''}
                onChange={e => setNewEvent({ ...newEvent, notes: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-white outline-none focus:border-amber-500 h-20 resize-none"
                placeholder="Details about the session..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={resetForm} className="px-4 py-2 text-zinc-400 hover:text-white">
              Cancel
            </button>
            <button
              onClick={handleSaveEvent}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg"
            >
              {editingId ? 'Update Event' : 'Save Event'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {timelineItems.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-2xl">
            <p className="text-zinc-500">No upcoming events or deadlines found.</p>
          </div>
        ) : (
          <div className="relative pl-4 md:pl-8 border-l-2 border-zinc-800 space-y-8 py-4">
            {timelineItems.map(item => {
              const time = item.isEvent ? item.time : undefined;
              const location = item.isEvent ? item.location : undefined;
              const notes = item.isEvent ? item.notes : undefined;

              const dateObj = new Date(item.date + (time ? `T${time}` : 'T00:00'));
              const isPast = dateObj < new Date();

              return (
                <div key={item.id} className={`relative ${isPast ? 'opacity-50 grayscale' : ''}`}>
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-[25px] md:-left-[41px] top-4 w-5 h-5 rounded-full border-4 border-zinc-950 ${item.type === 'GIG' ? 'bg-amber-500' : item.type === 'DEADLINE' ? 'bg-red-500' : 'bg-blue-500'}`}
                  ></div>

                  <div
                    className={`group relative p-5 rounded-2xl border ${getEventColor(item.type)} flex flex-col md:flex-row gap-4 md:items-center transition-all hover:border-zinc-600`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        {getEventIcon(item.type)}
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                          {item.type}
                        </span>
                      </div>
                      <h3
                        className={`text-xl font-bold text-white ${!item.isEvent ? 'cursor-pointer hover:text-amber-500 hover:underline' : ''}`}
                        onClick={() => !item.isEvent && onNavigateToSong(item.data.id)}
                      >
                        {item.title}
                      </h3>
                      {location && (
                        <div className="flex items-center gap-1 text-zinc-400 text-sm mt-1">
                          <MapPin size={14} />
                          {location}
                        </div>
                      )}
                      {notes && (
                        <p className="text-zinc-500 text-sm mt-2 whitespace-pre-wrap">{notes}</p>
                      )}
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 md:gap-0 border-t md:border-t-0 md:border-l border-zinc-800/50 pt-3 md:pt-0 md:pl-6 shrink-0 min-w-[120px]">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white leading-none">
                          {dateObj.getDate()}
                        </div>
                        <div className="text-sm text-zinc-500 uppercase font-bold">
                          {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                        {time && <div className="text-xs text-zinc-600 font-mono mt-1">{time}</div>}
                      </div>

                      {item.isEvent && (
                        <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditEvent(item)}
                            className="p-2 text-zinc-600 hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(item.id)}
                            className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
