import React, { memo, useMemo } from 'react';
import { MessageSquare, AlertTriangle, Lightbulb, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SongAnnotation, AnnotationType } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface AnnotationOverlayProps {
  /** All annotations for the song (filtered to visible during playback) */
  annotations: SongAnnotation[];
  /** Current bar position (1-indexed) */
  currentBar?: number;
  /** How many bars around current position to show annotations */
  barRange?: number;
  /** Optional className */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TYPE_CONFIG: Record<AnnotationType, {
  icon: React.ElementType;
  bgClass: string;
  textClass: string;
  borderClass: string;
}> = {
  note: {
    icon: MessageSquare,
    bgClass: 'bg-yellow-500/10 dark:bg-yellow-400/10',
    textClass: 'text-yellow-700 dark:text-yellow-300',
    borderClass: 'border-yellow-500/30',
  },
  cue: {
    icon: Lightbulb,
    bgClass: 'bg-blue-500/10 dark:bg-blue-400/10',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-500/30',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-red-500/10 dark:bg-red-400/10',
    textClass: 'text-red-700 dark:text-red-300',
    borderClass: 'border-red-500/30',
  },
  question: {
    icon: HelpCircle,
    bgClass: 'bg-green-500/10 dark:bg-green-400/10',
    textClass: 'text-green-700 dark:text-green-300',
    borderClass: 'border-green-500/30',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Read-only annotation overlay for Practice Room.
 * Displays annotations near the current playback position.
 */
export const AnnotationOverlay: React.FC<AnnotationOverlayProps> = memo(function AnnotationOverlay({
  annotations,
  currentBar,
  barRange = 2,
  className,
}) {
  // Filter annotations to only those visible during playback and near current bar
  const visibleAnnotations = useMemo(() => {
    if (!currentBar || annotations.length === 0) return [];

    return annotations.filter(annotation => {
      // Only show annotations marked as visible during playback
      if (!annotation.visibleDuringPlayback) return false;

      // Only show if within bar range of current position
      const distance = Math.abs(annotation.barIndex - currentBar);
      return distance <= barRange;
    });
  }, [annotations, currentBar, barRange]);

  // Sort by bar index (closest first)
  const sortedAnnotations = useMemo(() => {
    if (!currentBar) return visibleAnnotations;

    return [...visibleAnnotations].sort((a, b) => {
      const distA = Math.abs(a.barIndex - currentBar);
      const distB = Math.abs(b.barIndex - currentBar);
      return distA - distB;
    });
  }, [visibleAnnotations, currentBar]);

  // Don't render if no annotations
  if (sortedAnnotations.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'absolute top-0 right-0 m-4 max-w-xs space-y-2 z-10',
      'animate-fade-in',
      className
    )}>
      {sortedAnnotations.slice(0, 3).map((annotation) => {
        const config = TYPE_CONFIG[annotation.annotationType];
        const Icon = config.icon;

        return (
          <div
            key={annotation.id}
            className={cn(
              'flex items-start gap-2 p-2.5 rounded-lg border shadow-sm',
              'backdrop-blur-sm transition-opacity duration-200',
              config.bgClass,
              config.borderClass
            )}
          >
            <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', config.textClass)} />
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium', config.textClass)}>
                Bar {annotation.barIndex}
              </p>
              <p className="text-xs text-foreground/80 line-clamp-2">
                {annotation.content}
              </p>
              {annotation.authorName && (
                <p className="text-xs text-muted-foreground mt-1">
                  - {annotation.authorName}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* Show count if more annotations hidden */}
      {sortedAnnotations.length > 3 && (
        <p className="text-xs text-muted-foreground text-center">
          +{sortedAnnotations.length - 3} more annotation{sortedAnnotations.length - 3 > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
});

AnnotationOverlay.displayName = 'AnnotationOverlay';
