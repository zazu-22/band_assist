import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';

interface SaveStatusIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  className?: string;
}

/**
 * Displays the current save status with visual feedback.
 * Shows "Saving..." during save operations and "Saved X ago" after successful saves.
 */
export function SaveStatusIndicator({
  isSaving,
  lastSaved,
  className,
}: SaveStatusIndicatorProps) {
  if (isSaving) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs text-muted-foreground',
          className
        )}
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs text-muted-foreground',
          className
        )}
        role="status"
        aria-live="polite"
      >
        <Check className="h-3 w-3 text-success" />
        <span>Saved {formatRelativeTime(lastSaved)}</span>
      </div>
    );
  }

  // No save status yet
  return null;
}
