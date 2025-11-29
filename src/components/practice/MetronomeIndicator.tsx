import { memo } from 'react';
import { cn } from '@/lib/utils';

export interface MetronomeIndicatorProps {
  currentBeat: number; // 0 = no beat, 1-4 = current beat
}

export const MetronomeIndicator = memo(function MetronomeIndicator({
  currentBeat,
}: MetronomeIndicatorProps) {
  return (
    <div
      className="flex items-center gap-1 px-2 py-1 bg-muted rounded"
      aria-label={`Metronome beat ${currentBeat > 0 ? currentBeat : 'inactive'}`}
      data-testid="metronome-indicator"
    >
      {[1, 2, 3, 4].map(beat => (
        <div
          key={beat}
          className={cn(
            'w-2 h-2 rounded-full transition-all duration-75',
            'motion-reduce:transition-none',
            currentBeat === beat ? 'bg-primary scale-150' : 'bg-muted-foreground/30'
          )}
          data-testid={`beat-${beat}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
});

MetronomeIndicator.displayName = 'MetronomeIndicator';
