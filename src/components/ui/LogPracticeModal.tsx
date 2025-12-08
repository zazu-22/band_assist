import React, { memo, useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/primitives';
import { getTodayDateString } from '@/lib/dateUtils';
import type { Song, PracticeSession } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

interface LogPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  songs: Song[];
  /** If provided, modal is in edit mode for this session */
  editSession?: PracticeSession;
  onSubmit: (data: PracticeFormData) => Promise<void>;
}

export interface PracticeFormData {
  songId: string;
  durationMinutes: number;
  tempoBpm?: number;
  sectionsPracticed?: string[];
  notes?: string;
  date: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const LogPracticeModal: React.FC<LogPracticeModalProps> = memo(function LogPracticeModal({
  isOpen,
  onClose,
  songs,
  editSession,
  onSubmit,
}) {
  const isEditMode = !!editSession;

  // Form state
  const [songId, setSongId] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [tempoBpm, setTempoBpm] = useState('');
  const [sections, setSections] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens or editSession changes
  useEffect(() => {
    if (isOpen) {
      if (editSession) {
        setSongId(editSession.songId);
        setDate(editSession.date);
        setDurationMinutes(String(editSession.durationMinutes));
        setTempoBpm(editSession.tempoBpm ? String(editSession.tempoBpm) : '');
        setSections(editSession.sectionsPracticed?.join(', ') || '');
        setNotes(editSession.notes || '');
      } else {
        // Reset to defaults for new session
        setSongId(songs.length === 1 ? songs[0].id : '');
        setDate(getTodayDateString());
        setDurationMinutes('30');
        setTempoBpm('');
        setSections('');
        setNotes('');
      }
      setError(null);
    }
  }, [isOpen, editSession, songs]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
      }
    },
    [onClose]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validation
      if (!songId) {
        setError('Please select a song');
        return;
      }

      const duration = parseInt(durationMinutes, 10);
      if (isNaN(duration) || duration <= 0) {
        setError('Duration must be greater than 0 minutes');
        return;
      }
      if (duration > 480) {
        setError('Duration cannot exceed 480 minutes (8 hours)');
        return;
      }

      if (!date) {
        setError('Please select a date');
        return;
      }

      // Validate date is not in the future (defense against bypassing HTML max attribute)
      if (date > getTodayDateString()) {
        setError('Practice date cannot be in the future');
        return;
      }

      // Parse optional tempo
      let tempo: number | undefined;
      if (tempoBpm.trim()) {
        tempo = parseInt(tempoBpm, 10);
        if (isNaN(tempo) || tempo <= 0) {
          setError('Tempo must be a positive number');
          return;
        }
        if (tempo > 300) {
          setError('Tempo cannot exceed 300 BPM');
          return;
        }
      }

      // Parse sections (comma-separated)
      const sectionsPracticed = sections
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      setError(null);
      setIsSubmitting(true);

      try {
        await onSubmit({
          songId,
          durationMinutes: duration,
          tempoBpm: tempo,
          sectionsPracticed: sectionsPracticed.length > 0 ? sectionsPracticed : undefined,
          notes: notes.trim() || undefined,
          date,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save practice session');
      } finally {
        setIsSubmitting(false);
      }
    },
    [songId, durationMinutes, date, tempoBpm, sections, notes, onSubmit, onClose]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
              {isEditMode ? (
                <Pencil className="h-5 w-5 text-primary" />
              ) : (
                <Plus className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle>{isEditMode ? 'Edit Practice Session' : 'Log Practice Session'}</DialogTitle>
              <DialogDescription>
                {isEditMode
                  ? 'Update the details of your practice session'
                  : 'Record a practice session for tracking'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Song selection */}
          <div className="space-y-2">
            <Label htmlFor="song-select">Song *</Label>
            <Select value={songId} onValueChange={setSongId}>
              <SelectTrigger id="song-select">
                <SelectValue placeholder="Select a song" />
              </SelectTrigger>
              <SelectContent>
                {songs.map(song => (
                  <SelectItem key={song.id} value={song.id}>
                    {song.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="practice-date">Date *</Label>
            <Input
              id="practice-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={getTodayDateString()}
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes) *</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="480"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="30"
            />
          </div>

          {/* Tempo (optional) */}
          <div className="space-y-2">
            <Label htmlFor="tempo">Tempo (BPM)</Label>
            <Input
              id="tempo"
              type="number"
              min="1"
              max="300"
              value={tempoBpm}
              onChange={(e) => setTempoBpm(e.target.value)}
              placeholder="120"
            />
          </div>

          {/* Sections (optional) */}
          <div className="space-y-2">
            <Label htmlFor="sections">Sections Practiced</Label>
            <Input
              id="sections"
              type="text"
              value={sections}
              onChange={(e) => setSections(e.target.value)}
              placeholder="Intro, Verse 1, Chorus (comma-separated)"
            />
          </div>

          {/* Notes (optional) */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations or reminders"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Log Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

LogPracticeModal.displayName = 'LogPracticeModal';
