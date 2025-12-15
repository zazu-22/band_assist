import React, { memo } from 'react';
import { StickyNote, Lightbulb, AlertTriangle, HelpCircle, CheckCircle2 } from 'lucide-react';
import type { AnnotationType } from '@/types';
import { cn } from '@/lib/utils';

interface AnnotationMarkerProps {
  type: AnnotationType;
  isResolved?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/** Icon mapping for annotation types */
const TYPE_ICONS: Record<AnnotationType, React.ElementType> = {
  note: StickyNote,
  cue: Lightbulb,
  warning: AlertTriangle,
  question: HelpCircle,
};

/** Color classes for annotation types (Tailwind) */
const TYPE_COLORS: Record<AnnotationType, { bg: string; text: string; border: string; ring: string }> = {
  note: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/40',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-400 dark:border-yellow-600',
    ring: 'ring-yellow-400/50',
  },
  cue: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-400 dark:border-blue-600',
    ring: 'ring-blue-400/50',
  },
  warning: {
    bg: 'bg-red-100 dark:bg-red-900/40',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-400 dark:border-red-600',
    ring: 'ring-red-400/50',
  },
  question: {
    bg: 'bg-green-100 dark:bg-green-900/40',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-400 dark:border-green-600',
    ring: 'ring-green-400/50',
  },
};

/** Resolved state colors override */
const RESOLVED_COLORS = {
  bg: 'bg-muted',
  text: 'text-muted-foreground',
  border: 'border-muted-foreground/30',
  ring: 'ring-muted-foreground/30',
};

/** Size classes */
const SIZE_CLASSES = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

const ICON_SIZES = {
  sm: 12,
  md: 14,
  lg: 18,
};

/**
 * A visual marker for an annotation, displayed on the score overlay.
 * Shows different icons and colors based on annotation type.
 */
export const AnnotationMarker = memo(function AnnotationMarker({
  type,
  isResolved = false,
  onClick,
  className,
  size = 'md',
}: AnnotationMarkerProps) {
  const Icon = isResolved ? CheckCircle2 : TYPE_ICONS[type];
  const colors = isResolved ? RESOLVED_COLORS : TYPE_COLORS[type];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border flex items-center justify-center',
        'transition-all duration-150',
        'hover:scale-110 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        SIZE_CLASSES[size],
        colors.bg,
        colors.text,
        colors.border,
        colors.ring,
        isResolved && 'opacity-60',
        className
      )}
      title={`${type.charAt(0).toUpperCase() + type.slice(1)} annotation${isResolved ? ' (resolved)' : ''}`}
      aria-label={`${type} annotation${isResolved ? ', resolved' : ''}`}
    >
      <Icon size={ICON_SIZES[size]} strokeWidth={2} />
    </button>
  );
});

AnnotationMarker.displayName = 'AnnotationMarker';
