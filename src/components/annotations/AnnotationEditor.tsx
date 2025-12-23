import React, { useState, useCallback, memo } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { Textarea } from '@/components/primitives/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/primitives/select';
import { Label } from '@/components/primitives/label';
import { Checkbox } from '@/components/primitives/checkbox';
import type { SongAnnotation, AnnotationType, SongSection } from '@/types';
import { AnnotationMarker } from './AnnotationMarker';
import { cn } from '@/lib/utils';

const MAX_CONTENT_LENGTH = 2000;

interface AnnotationEditorProps {
  /** Existing annotation to edit, or null for creating new */
  annotation?: SongAnnotation | null;
  /** Pre-filled position for new annotations */
  initialPosition?: {
    barIndex: number;
    beatIndex: number;
    trackIndex: number;
  };
  /** Available sections to link to */
  sections?: SongSection[];
  /** Called when save is clicked */
  onSave: (data: {
    content: string;
    annotationType: AnnotationType;
    sectionId?: string;
    visibleDuringPlayback: boolean;
  }) => void;
  /** Called when delete is clicked (only for existing annotations) */
  onDelete?: () => void;
  /** Called when cancel/close is clicked */
  onClose: () => void;
  /** Whether a save operation is in progress */
  isSaving?: boolean;
  /** Whether a delete operation is in progress */
  isDeleting?: boolean;
}

const ANNOTATION_TYPES: { value: AnnotationType; label: string; description: string }[] = [
  { value: 'note', label: 'Note', description: 'General notes or comments' },
  { value: 'cue', label: 'Cue', description: 'Performance reminders' },
  { value: 'warning', label: 'Warning', description: 'Problem areas to watch' },
  { value: 'question', label: 'Question', description: 'Points for discussion' },
];

/**
 * Modal/form for creating or editing an annotation.
 * Shows position info, type selector, content textarea, and section link.
 *
 * Note: This component uses annotation?.id as a key to reset state when
 * the annotation prop changes. Parent should re-mount with different key
 * to edit a different annotation.
 */
export const AnnotationEditor = memo(function AnnotationEditor({
  annotation,
  initialPosition,
  sections = [],
  onSave,
  onDelete,
  onClose,
  isSaving = false,
  isDeleting = false,
}: AnnotationEditorProps) {
  const isEditing = !!annotation;
  const position = annotation
    ? { barIndex: annotation.barIndex, beatIndex: annotation.beatIndex, trackIndex: annotation.trackIndex }
    : initialPosition;

  // Initialize state from annotation prop (parent should change key to reset)
  const [content, setContent] = useState(annotation?.content ?? '');
  const [annotationType, setAnnotationType] = useState<AnnotationType>(annotation?.annotationType ?? 'note');
  const [sectionId, setSectionId] = useState<string | undefined>(annotation?.sectionId);
  const [visibleDuringPlayback, setVisibleDuringPlayback] = useState(annotation?.visibleDuringPlayback ?? true);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    onSave({
      content: content.trim(),
      annotationType,
      sectionId,
      visibleDuringPlayback,
    });
  }, [content, annotationType, sectionId, visibleDuringPlayback, onSave]);

  const charactersRemaining = MAX_CONTENT_LENGTH - content.length;
  const isOverLimit = charactersRemaining < 0;
  const canSave = content.trim().length > 0 && !isOverLimit && !isSaving;

  return (
    <div className="bg-card border border-border rounded-xl shadow-xl p-4 w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <AnnotationMarker type={annotationType} size="lg" />
          <div>
            <h3 className="font-bold text-foreground">
              {isEditing ? 'Edit Annotation' : 'New Annotation'}
            </h3>
            {position && (
              <p className="text-xs text-muted-foreground">
                Bar {position.barIndex + 1}, Beat {position.beatIndex + 1}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          disabled={isSaving || isDeleting}
          aria-label="Close editor"
        >
          <X size={18} />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Selector */}
        <div className="space-y-2">
          <Label htmlFor="annotation-type">Type</Label>
          <Select value={annotationType} onValueChange={(v) => setAnnotationType(v as AnnotationType)}>
            <SelectTrigger id="annotation-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANNOTATION_TYPES.map(({ value, label, description }) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <AnnotationMarker type={value} size="sm" />
                    <span>{label}</span>
                    <span className="text-muted-foreground text-xs">- {description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="annotation-content">Content</Label>
            <span className={cn(
              'text-xs',
              isOverLimit ? 'text-destructive font-bold' : 'text-muted-foreground'
            )}>
              {charactersRemaining} characters remaining
            </span>
          </div>
          <Textarea
            id="annotation-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your annotation..."
            rows={4}
            className={cn(isOverLimit && 'border-destructive')}
            disabled={isSaving || isDeleting}
            autoFocus
          />
        </div>

        {/* Section Link (optional) */}
        {sections.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="annotation-section">Link to Section (optional)</Label>
            <Select
              value={sectionId ?? 'none'}
              onValueChange={(v) => setSectionId(v === 'none' ? undefined : v)}
            >
              <SelectTrigger id="annotation-section">
                <SelectValue placeholder="Select a section..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No section</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name} (Bars {section.startBar}-{section.endBar})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Visibility Toggle */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="visible-during-playback"
            checked={visibleDuringPlayback}
            onCheckedChange={(checked: boolean | 'indeterminate') => setVisibleDuringPlayback(checked === true)}
            disabled={isSaving || isDeleting}
          />
          <Label htmlFor="visible-during-playback" className="text-sm cursor-pointer">
            Show during playback
          </Label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          {isEditing && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isSaving || isDeleting}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {isDeleting ? (
                <span className="animate-pulse">Deleting...</span>
              ) : (
                <>
                  <Trash2 size={14} className="mr-1" />
                  Delete
                </>
              )}
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving || isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!canSave}
            >
              {isSaving ? (
                <span className="animate-pulse">Saving...</span>
              ) : (
                <>
                  <Save size={14} className="mr-1" />
                  {isEditing ? 'Update' : 'Create'}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
});

AnnotationEditor.displayName = 'AnnotationEditor';
