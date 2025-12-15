import React, { memo } from 'react';
import { CheckCircle2, Edit2, Trash2, MapPin, User, Clock } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import type { SongAnnotation } from '@/types';
import { AnnotationMarker } from './AnnotationMarker';
import { cn } from '@/lib/utils';

interface AnnotationBubbleProps {
  annotation: SongAnnotation;
  /** Whether the current user authored this annotation */
  isAuthor?: boolean;
  /** Section name if linked to a section */
  sectionName?: string;
  /** Author display name */
  authorName?: string;
  /** Called when edit button is clicked */
  onEdit?: () => void;
  /** Called when delete button is clicked */
  onDelete?: () => void;
  /** Called when resolve/unresolve is toggled */
  onToggleResolve?: () => void;
  /** Whether resolve toggle is in progress */
  isTogglingResolve?: boolean;
  className?: string;
}

/**
 * Expanded annotation detail view shown when an annotation is selected.
 * Displays full content, metadata, and action buttons.
 */
export const AnnotationBubble = memo(function AnnotationBubble({
  annotation,
  isAuthor = false,
  sectionName,
  authorName,
  onEdit,
  onDelete,
  onToggleResolve,
  isTogglingResolve = false,
  className,
}: AnnotationBubbleProps) {
  const formattedDate = new Date(annotation.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const isQuestion = annotation.annotationType === 'question';

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-lg shadow-lg p-4 w-full max-w-sm',
        'animate-in fade-in slide-in-from-bottom-2 duration-150',
        annotation.isResolved && 'opacity-75',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <AnnotationMarker
            type={annotation.annotationType}
            isResolved={annotation.isResolved}
            size="md"
          />
          <div>
            <span className="font-semibold text-sm text-foreground capitalize">
              {annotation.annotationType}
            </span>
            {annotation.isResolved && (
              <span className="ml-2 text-xs text-muted-foreground">(Resolved)</span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <p className={cn(
        'text-sm text-foreground whitespace-pre-wrap mb-3',
        annotation.isResolved && 'text-muted-foreground'
      )}>
        {annotation.content}
      </p>

      {/* Metadata */}
      <div className="space-y-1 text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-1">
          <MapPin size={12} />
          <span>Bar {annotation.barIndex + 1}, Beat {annotation.beatIndex + 1}</span>
          {sectionName && (
            <>
              <span className="mx-1">|</span>
              <span className="text-primary">{sectionName}</span>
            </>
          )}
        </div>
        {authorName && (
          <div className="flex items-center gap-1">
            <User size={12} />
            <span>{authorName}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Clock size={12} />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        {/* Resolve toggle for questions */}
        {isQuestion && onToggleResolve && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleResolve}
            disabled={isTogglingResolve}
            className={cn(
              'gap-1',
              annotation.isResolved
                ? 'text-muted-foreground'
                : 'text-green-600 hover:text-green-700'
            )}
          >
            <CheckCircle2 size={14} />
            {isTogglingResolve ? (
              <span className="animate-pulse">...</span>
            ) : annotation.isResolved ? (
              'Unresolve'
            ) : (
              'Resolve'
            )}
          </Button>
        )}

        {!isQuestion && <div />}

        {/* Edit/Delete for author */}
        {isAuthor && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Edit annotation"
              >
                <Edit2 size={14} />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                title="Delete annotation"
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

AnnotationBubble.displayName = 'AnnotationBubble';
