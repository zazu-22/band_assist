import React, { memo, useState, useEffect, useCallback } from 'react';
import { Plus, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/primitives';
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
// HELPER FUNCTIONS
/**
 * Get today's date in YYYY-MM-DD format.
 *
 * @returns Today's date as a string in `YYYY-MM-DD` format.
 */

function getTodayDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const [date, setDate] = useState(getTodayDate());
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
        setDate(getTodayDate());
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

      if (!date) {
        setError('Please select a date');
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
              max={getTodayDate()}
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes) *</Label>
            <Input
              id="duration"
              type="number"
              min="1"
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
            <Input
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations or reminders"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Log Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

LogPracticeModal.displayName = 'LogPracticeModal';