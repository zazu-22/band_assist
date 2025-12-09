import React, { memo, useState, useCallback } from 'react';
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
import { cn } from '@/lib/utils';
import { getTodayDateString } from '@/lib/dateUtils';
import type { Song, PracticeSession, UserSongStatus, UserSongProgress } from '@/types';

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
  /** Map of songId to current status (for pre-populating status fields) */
  songStatuses?: Map<string, UserSongProgress>;
  /** Callback to update song status (only called if status changed) */
  onStatusChange?: (songId: string, status: UserSongStatus, confidence?: number) => Promise<void>;
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
// CONSTANTS
// =============================================================================

// Status options for the Learning Status dropdown
const STATUS_OPTIONS: { value: UserSongStatus; label: string }[] = [
  { value: 'Not Started', label: 'Not Started' },
  { value: 'Learning', label: 'Learning' },
  { value: 'Learned', label: 'Learned' },
  { value: 'Mastered', label: 'Mastered' },
];

// Confidence level labels for accessibility
const CONFIDENCE_LABELS: Record<number, string> = {
  1: 'not confident',
  2: 'slightly confident',
  3: 'moderately confident',
  4: 'confident',
  5: 'very confident',
};

// Helper for confidence button styling
const getConfidenceButtonClass = (isSelected: boolean) =>
  cn(
    'flex-1 py-2 rounded-lg text-lg font-bold transition-all',
    isSelected
      ? 'bg-primary text-primary-foreground scale-105 shadow-md'
      : 'bg-muted text-muted-foreground hover:bg-muted/80'
  );

// =============================================================================
// FORM STATE
// =============================================================================

interface FormState {
  songId: string;
  date: string;
  durationMinutes: string;
  tempoBpm: string;
  sections: string;
  notes: string;
  status: UserSongStatus;
  confidence: number | undefined;
  originalStatus: UserSongStatus;
  originalConfidence: number | undefined;
}

/**
 * Compute initial form state from props.
 * Called once when the form mounts (via lazy useState initializer).
 */
function computeInitialFormState(
  editSession: PracticeSession | undefined,
  songs: Song[],
  songStatuses: Map<string, UserSongProgress> | undefined
): FormState {
  const getSongStatus = (id: string): { status: UserSongStatus; confidence: number | undefined } => {
    const songStatus = songStatuses?.get(id);
    return {
      status: songStatus?.status || 'Not Started',
      confidence: songStatus?.confidenceLevel,
    };
  };

  if (editSession) {
    const { status: songStatus, confidence: songConfidence } = getSongStatus(editSession.songId);
    return {
      songId: editSession.songId,
      date: editSession.date,
      durationMinutes: String(editSession.durationMinutes),
      tempoBpm: editSession.tempoBpm ? String(editSession.tempoBpm) : '',
      sections: editSession.sectionsPracticed?.join(', ') || '',
      notes: editSession.notes || '',
      status: songStatus,
      confidence: songConfidence,
      originalStatus: songStatus,
      originalConfidence: songConfidence,
    };
  }

  // New session - auto-select song if only one available
  const initialSongId = songs.length === 1 ? songs[0].id : '';
  const { status: songStatus, confidence: songConfidence } = initialSongId
    ? getSongStatus(initialSongId)
    : { status: 'Not Started' as UserSongStatus, confidence: undefined };

  return {
    songId: initialSongId,
    date: getTodayDateString(),
    durationMinutes: '30',
    tempoBpm: '',
    sections: '',
    notes: '',
    status: songStatus,
    confidence: songConfidence,
    originalStatus: songStatus,
    originalConfidence: songConfidence,
  };
}

// =============================================================================
// INNER FORM COMPONENT
// =============================================================================

interface LogPracticeFormProps {
  songs: Song[];
  editSession?: PracticeSession;
  songStatuses?: Map<string, UserSongProgress>;
  onSubmit: (data: PracticeFormData) => Promise<void>;
  onStatusChange?: (songId: string, status: UserSongStatus, confidence?: number) => Promise<void>;
  onClose: () => void;
}

/**
 * Inner form component that manages its own state.
 * Uses a lazy initializer to compute initial state from props on mount.
 * Parent component uses a key to force remount when modal opens.
 */
const LogPracticeForm: React.FC<LogPracticeFormProps> = ({
  songs,
  editSession,
  songStatuses,
  onSubmit,
  onStatusChange,
  onClose,
}) => {
  const isEditMode = !!editSession;

  // Initialize state once on mount using lazy initializer
  const [formState, setFormState] = useState<FormState>(() =>
    computeInitialFormState(editSession, songs, songStatuses)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Destructure for easier access
  const { songId, date, durationMinutes, tempoBpm, sections, notes, status, confidence, originalStatus, originalConfidence } = formState;

  // Field setters
  const setDate = useCallback((value: string) => setFormState(prev => ({ ...prev, date: value })), []);
  const setDurationMinutes = useCallback((value: string) => setFormState(prev => ({ ...prev, durationMinutes: value })), []);
  const setTempoBpm = useCallback((value: string) => setFormState(prev => ({ ...prev, tempoBpm: value })), []);
  const setSections = useCallback((value: string) => setFormState(prev => ({ ...prev, sections: value })), []);
  const setNotes = useCallback((value: string) => setFormState(prev => ({ ...prev, notes: value })), []);
  const setStatus = useCallback((value: UserSongStatus) => setFormState(prev => ({ ...prev, status: value })), []);
  const setConfidence = useCallback((value: number | undefined) => setFormState(prev => ({ ...prev, confidence: value })), []);

  // Helper to get status for a song from the statuses map
  const getSongStatus = useCallback(
    (id: string): { status: UserSongStatus; confidence: number | undefined } => {
      const songStatus = songStatuses?.get(id);
      return {
        status: songStatus?.status || 'Not Started',
        confidence: songStatus?.confidenceLevel,
      };
    },
    [songStatuses]
  );

  // Update status when song selection changes
  const handleSongChange = useCallback(
    (newSongId: string) => {
      const { status: songStatus, confidence: songConfidence } = getSongStatus(newSongId);
      setFormState(prev => ({
        ...prev,
        songId: newSongId,
        status: songStatus,
        confidence: songConfidence,
        originalStatus: songStatus,
        originalConfidence: songConfidence,
      }));
    },
    [getSongStatus]
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save practice session');
        setIsSubmitting(false);
        return;
      }

      // Practice session saved successfully - update status if changed
      // Status update errors don't prevent modal close (parent handles via toast)
      const statusChanged = status !== originalStatus || confidence !== originalConfidence;
      if (statusChanged && onStatusChange) {
        try {
          await onStatusChange(songId, status, confidence);
        } catch {
          // Status update failed but practice session was saved
          // Parent component handles this error (typically via toast)
        }
      }

      setIsSubmitting(false);
      onClose();
    },
    [songId, durationMinutes, date, tempoBpm, sections, notes, onSubmit, onClose, status, confidence, originalStatus, originalConfidence, onStatusChange]
  );

  return (
    <>
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
          <Select value={songId} onValueChange={handleSongChange}>
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

        {/* Learning Status */}
        <div className="space-y-2">
          <Label htmlFor="learning-status">Learning Status</Label>
          <Select value={status} onValueChange={(value: UserSongStatus) => setStatus(value)}>
            <SelectTrigger id="learning-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Confidence Level */}
        <div className="space-y-2">
          <Label id="confidence-label">Confidence Level</Label>
          <div className="flex gap-2" role="group" aria-labelledby="confidence-label">
            {[1, 2, 3, 4, 5].map(level => (
              <button
                key={level}
                type="button"
                aria-label={`Confidence level ${level} - ${CONFIDENCE_LABELS[level]}`}
                aria-pressed={confidence === level}
                onClick={() => setConfidence(confidence === level ? undefined : level)}
                className={getConfidenceButtonClass(confidence === level)}
              >
                {level}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            1 = Not confident, 5 = Very confident
          </p>
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
    </>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Modal wrapper that handles open/close state and forces form remount on open.
 * Uses a key based on editSession ID to force form re-initialization when
 * switching between edit sessions or between new/edit mode.
 */
export const LogPracticeModal: React.FC<LogPracticeModalProps> = memo(function LogPracticeModal({
  isOpen,
  onClose,
  songs,
  editSession,
  onSubmit,
  songStatuses,
  onStatusChange,
}) {
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
      }
    },
    [onClose]
  );

  // Generate a key that changes when the modal opens or editSession changes
  // This forces the inner form to remount and re-initialize its state
  const formKey = editSession?.id ?? 'new';

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        {isOpen && (
          <LogPracticeForm
            key={formKey}
            songs={songs}
            editSession={editSession}
            songStatuses={songStatuses}
            onSubmit={onSubmit}
            onStatusChange={onStatusChange}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
});

LogPracticeModal.displayName = 'LogPracticeModal';
