import { useEffect, useState, useRef } from 'react';
import { Loader2, Check } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';

interface SaveStatusIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  className?: string;
}

/**
 * Displays the current save status with visual feedback.
 * Shows "Saving..." during save operations and "Saved X ago" after successful saves.
 * Automatically updates the relative time every 5 seconds.
 * Pauses updates when tab is hidden to save resources.
 */
export function SaveStatusIndicator({
  isSaving,
  lastSaved,
  className,
}: SaveStatusIndicatorProps) {
  const [relativeTime, setRelativeTime] = useState<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update relative time every 5 seconds, pausing when tab is hidden
  useEffect(() => {
    if (!lastSaved) return;

    const updateTime = () => {
      setRelativeTime(formatRelativeTime(lastSaved));
    };

    const startInterval = () => {
      updateTime(); // Update immediately
      intervalRef.current = setInterval(updateTime, 5000);
    };

    const stopInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateTime(); // Update immediately when tab becomes visible
        startInterval();
      } else {
        stopInterval();
      }
    };

    // Start interval if tab is visible
    if (document.visibilityState === 'visible') {
      startInterval();
    } else {
      updateTime(); // Still set initial value
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [lastSaved]);

  // Single container for consistent aria-live region
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs text-muted-foreground',
        className
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {isSaving ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          <span>Saving...</span>
        </>
      ) : lastSaved ? (
        <>
          <Check className="h-3 w-3 text-success" aria-hidden="true" />
          <span>Saved {relativeTime}</span>
        </>
      ) : null}
    </div>
  );
}

SaveStatusIndicator.displayName = 'SaveStatusIndicator';
