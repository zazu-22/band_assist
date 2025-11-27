import { memo, useCallback, useMemo } from 'react';

export interface ProgressBarProps {
  /** Current playback position in milliseconds */
  currentTime: number;
  /** Total duration in milliseconds */
  totalTime: number;
  /** Callback when user seeks to a position (0-1 percentage) */
  onSeek: (percentage: number) => void;
}

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const ProgressBar = memo(function ProgressBar({
  currentTime,
  totalTime,
  onSeek,
}: ProgressBarProps) {
  const percentage = useMemo(() =>
    totalTime > 0 ? (currentTime / totalTime) * 100 : 0,
    [currentTime, totalTime]
  );

  const formattedCurrent = useMemo(() => formatTime(currentTime), [currentTime]);
  const formattedTotal = useMemo(() => formatTime(totalTime), [totalTime]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickPercentage = Math.max(0, Math.min(1, x / rect.width));
    onSeek(clickPercentage);
  }, [onSeek]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    let seekDelta = 0;
    if (e.key === 'ArrowLeft') seekDelta = -0.05; // Seek back 5%
    else if (e.key === 'ArrowRight') seekDelta = 0.05; // Seek forward 5%
    else if (e.key === 'Home') { onSeek(0); return; } // Jump to start
    else if (e.key === 'End') { onSeek(1); return; } // Jump to end

    if (seekDelta !== 0) {
      e.preventDefault();
      const newPercentage = Math.max(0, Math.min(1, percentage / 100 + seekDelta));
      onSeek(newPercentage);
    }
  }, [percentage, onSeek]);

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 bg-muted/30 border-t border-border"
      data-testid="progress-bar"
    >
      <span className="text-xs font-mono tabular-nums text-muted-foreground w-10 text-right">
        {formattedCurrent}
      </span>

      <div
        className="flex-1 h-2 bg-muted rounded-full cursor-pointer group relative"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="slider"
        aria-valuenow={currentTime}
        aria-valuemin={0}
        aria-valuemax={totalTime}
        aria-label="Playback position"
        tabIndex={0}
      >
        {/* Progress fill */}
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />

        {/* Hover scrubber handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-background border-2 border-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `calc(${percentage}% - 6px)` }}
        />
      </div>

      <span className="text-xs font-mono tabular-nums text-muted-foreground w-10">
        {formattedTotal}
      </span>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';
