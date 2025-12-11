import React, { memo, useState, useCallback, useMemo } from 'react';
import { Calendar, Clock, MapPin, Plus, Trash2, Guitar, Star, Edit2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/primitives';
import { ConfirmDialog, EmptyState, toast } from '@/components/ui';
import { StorageService } from '@/services/storageService';
import type { BandEvent, Song } from '@/types';
import { cn } from '@/lib/utils';
import { parseLocalDate } from '@/lib/dateUtils';

interface ScheduleManagerProps {
  events: BandEvent[];
  setEvents: React.Dispatch<React.SetStateAction<BandEvent[]>>;
  songs: Song[];
  onNavigateToSong: (songId: string) => void;
}

/** Initial state for the event form */
const INITIAL_EVENT_STATE: Partial<BandEvent> = {
  type: 'PRACTICE',
  date: new Date().toISOString().split('T')[0],
  time: '19:00',
};

/** Initial state for confirm dialog */
const INITIAL_DIALOG_STATE = { isOpen: false, eventId: null as string | null };

export const ScheduleManager: React.FC<ScheduleManagerProps> = memo(function ScheduleManager({
  events,
  setEvents,
  songs,
  onNavigateToSong,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<BandEvent>>(INITIAL_EVENT_STATE);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState(INITIAL_DIALOG_STATE);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog(INITIAL_DIALOG_STATE);
  }, []);

  const resetForm = useCallback(() => {
    setIsAdding(false);
    setEditingId(null);
    setNewEvent({
      ...INITIAL_EVENT_STATE,
      date: new Date().toISOString().split('T')[0],
    });
  }, []);

  const handleSaveEvent = useCallback(() => {
    if (!newEvent.title || !newEvent.date) return;

    if (editingId) {
      setEvents(prev =>
        prev.map(e => (e.id === editingId ? ({ ...e, ...newEvent } as BandEvent) : e))
      );
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
      setEvents(prev => [...prev, event]);
    }
    resetForm();
  }, [newEvent, editingId, setEvents, resetForm]);

  const handleEditEvent = useCallback((item: BandEvent) => {
    const { id, title, date, time, type, location, notes } = item;
    setNewEvent({ id, title, date, time, type, location, notes });
    setEditingId(id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleDeleteEvent = useCallback((id: string) => {
    setConfirmDialog({ isOpen: true, eventId: id });
  }, []);

  const confirmDeleteEvent = useCallback(async () => {
    const eventId = confirmDialog.eventId;
    closeConfirmDialog();

    if (eventId) {
      try {
        await StorageService.deleteEvent(eventId);
        setEvents(prev => prev.filter(e => e.id !== eventId));
        toast.success('Event deleted successfully');
      } catch (error) {
        console.error('Error deleting event:', error);
        toast.error('Failed to delete event. Please try again.');
      }
    }
  }, [confirmDialog.eventId, setEvents, closeConfirmDialog]);

  const handleStartAdding = useCallback(() => {
    resetForm();
    setIsAdding(true);
  }, [resetForm]);

  const handleEventFieldChange = useCallback((field: keyof BandEvent, value: string) => {
    setNewEvent(prev => ({ ...prev, [field]: value }));
  }, []);

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

  // Memoize timeline items calculation
  const timelineItems = useMemo<TimelineItem[]>(() => {
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

    return [...events.map(e => ({ ...e, isEvent: true as const })), ...songTargets].sort(
      (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
    );
  }, [events, songs]);

  const getEventIcon = useCallback((type: string) => {
    switch (type) {
      case 'PRACTICE':
        return <Guitar className="text-info" />;
      case 'GIG':
        return <Star className="text-primary fill-primary" />;
      case 'DEADLINE':
        return <Clock className="text-destructive" />;
      default:
        return <Calendar className="text-muted-foreground" />;
    }
  }, []);

  const getEventColor = useCallback((type: string) => {
    switch (type) {
      case 'PRACTICE':
        return 'border-info/30 bg-info/5';
      case 'GIG':
        return 'border-primary/50 bg-primary/10';
      case 'DEADLINE':
        return 'border-border bg-muted/50 border-dashed border-2';
      default:
        return 'border-border bg-card';
    }
  }, []);

  return (
    <div className="relative p-4 sm:p-6 lg:p-10 space-y-8">
      {/* Ambient background glow - fixed size to maintain consistent fade on all viewports */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">Band Schedule</h2>
          <p className="text-muted-foreground mt-1">Manage practices, gigs, and song goals</p>
        </div>
        <Button onClick={handleStartAdding}>
          <Plus size={18} />
          Add Event
        </Button>
      </div>

      {isAdding && (
        <Card className="mb-8 animate-slide-in-from-top shadow-lg">
          <CardHeader>
            <CardTitle className="font-serif">{editingId ? 'Edit Event' : 'New Event'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="event-title">Event Title</Label>
                <Input
                  id="event-title"
                  type="text"
                  value={newEvent.title || ''}
                  onChange={e => handleEventFieldChange('title', e.target.value)}
                  placeholder="e.g. Garage Practice"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-type">Type</Label>
                <Select
                  value={newEvent.type}
                  onValueChange={value => handleEventFieldChange('type', value)}
                >
                  <SelectTrigger id="event-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRACTICE">Practice</SelectItem>
                    <SelectItem value="GIG">Gig / Performance</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-date">Date</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={newEvent.date}
                  onChange={e => handleEventFieldChange('date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-time">Time</Label>
                <Input
                  id="event-time"
                  type="time"
                  value={newEvent.time}
                  onChange={e => handleEventFieldChange('time', e.target.value)}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="event-location">Location</Label>
                <Input
                  id="event-location"
                  type="text"
                  value={newEvent.location || ''}
                  onChange={e => handleEventFieldChange('location', e.target.value)}
                  placeholder="e.g. Brother 1's House"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="event-notes">Notes</Label>
                <Textarea
                  id="event-notes"
                  value={newEvent.notes || ''}
                  onChange={e => handleEventFieldChange('notes', e.target.value)}
                  className="min-h-20 resize-none"
                  placeholder="Details about the session..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSaveEvent}>{editingId ? 'Update Event' : 'Save Event'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {timelineItems.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No upcoming events"
            description="Add your first event to start building your band's schedule."
            action={{
              label: 'Add Event',
              onClick: handleStartAdding,
            }}
          />
        ) : (
          <div className="relative pl-4 md:pl-8 border-l-2 border-border space-y-8 py-4">
            {timelineItems.map((item, index) => {
              const time = item.isEvent ? item.time : undefined;
              const location = item.isEvent ? item.location : undefined;
              const notes = item.isEvent ? item.notes : undefined;

              // Note: Using `new Date(date + "T" + time)` is correct here because we're
              // creating a full ISO 8601 datetime string, which parses as local time.
              // The timezone bug only affects date-only strings like "2025-01-15".
              const dateObj = new Date(item.date + (time ? `T${time}` : 'T00:00'));
              const isPast = dateObj < new Date();

              const dotColor =
                item.type === 'GIG'
                  ? 'bg-primary'
                  : item.type === 'DEADLINE'
                    ? 'bg-destructive'
                    : 'bg-info';

              return (
                <div
                  key={item.id}
                  className={cn(
                    'relative',
                    'animate-slide-in-from-bottom animation-forwards opacity-0',
                    isPast && 'opacity-60 grayscale'
                  )}
                  style={{ animationDelay: `${index * 75}ms` }}
                >
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-[25px] md:-left-[41px] top-4 w-5 h-5 rounded-full border-4 border-background ${dotColor}`}
                    aria-hidden="true"
                  />

                  <Card
                    className={`group relative ${getEventColor(item.type)} hover:border-border/80 transition-all`}
                  >
                    <CardContent className="p-5 flex flex-col md:flex-row gap-4 md:items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          {getEventIcon(item.type)}
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {item.type}
                          </span>
                        </div>
                        {item.isEvent ? (
                          <h3 className="text-xl font-bold text-foreground">{item.title}</h3>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onNavigateToSong(item.data.id)}
                            className="text-xl font-bold text-foreground hover:text-primary hover:underline text-left"
                          >
                            {item.title}
                          </button>
                        )}
                        {location && (
                          <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
                            <MapPin size={14} />
                            {location}
                          </div>
                        )}
                        {notes && (
                          <p className="text-muted-foreground text-sm mt-2 whitespace-pre-wrap">
                            {notes}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 md:gap-0 border-t md:border-t-0 md:border-l border-border/50 pt-3 md:pt-0 md:pl-6 shrink-0 min-w-[120px]">
                        <div className="text-right">
                          <div className="text-2xl font-bold font-mono tabular-nums text-foreground leading-none">
                            {dateObj.getDate()}
                          </div>
                          <div className="text-sm text-muted-foreground uppercase font-bold">
                            {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                          {time && (
                            <div className="text-xs text-muted-foreground font-mono tabular-nums mt-1">
                              {time}
                            </div>
                          )}
                        </div>

                        {item.isEvent && (
                          <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditEvent(item)}
                              aria-label="Edit event"
                            >
                              <Edit2 size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteEvent(item.id)}
                              className="hover:text-destructive"
                              aria-label="Delete event"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Event"
        message="Are you sure you want to remove this event?"
        variant="danger"
        onConfirm={confirmDeleteEvent}
        onCancel={closeConfirmDialog}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
});

ScheduleManager.displayName = 'ScheduleManager';
