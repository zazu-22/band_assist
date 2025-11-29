import { memo } from 'react';
import { Clock } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';
import type { MetronomeState } from './types';

export interface MetronomeControlsProps {
  /** Current metronome state */
  metronomeState: MetronomeState;
  /** Callback when BPM changes via slider */
  onBpmChange: (bpm: number) => void;
  /** Callback when metronome toggle button is clicked */
  onToggle: () => void;
  /** Visual variant for different screen sizes */
  variant?: 'compact' | 'expanded';
}

/**
 * Non-GP metronome controls with toggle button and BPM slider.
 * Used for PDF/image charts that don't have AlphaTab's built-in metronome.
 *
 * @example
 * ```tsx
 * <MetronomeControls
 *   metronomeState={{ isActive: true, bpm: 120 }}
 *   onBpmChange={(bpm) => setMetronomeBpm(bpm)}
 *   onToggle={() => toggleMetronome()}
 *   variant="compact"
 * />
 * ```
 */
export const MetronomeControls = memo(function MetronomeControls({
  metronomeState,
  onBpmChange,
  onToggle,
  variant = 'compact',
}: MetronomeControlsProps) {
  // Variant-specific sizing for slider and BPM display
  const sliderWidth = variant === 'expanded' ? 'w-24' : 'w-20';
  const bpmDisplayWidth = variant === 'expanded' ? 'w-10' : 'w-8';

  return (
    <div className="flex items-center gap-2 bg-muted rounded-lg p-1 border border-border">
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggle}
              className={cn(
                'h-11 w-11 sm:h-9 sm:w-9 flex items-center justify-center rounded-md transition-colors',
                metronomeState.isActive
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
              )}
              aria-label={metronomeState.isActive ? 'Stop metronome' : 'Start metronome'}
            >
              <Clock size={18} />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{metronomeState.isActive ? 'Stop metronome' : 'Start metronome'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <input
        type="range"
        min="40"
        max="220"
        value={metronomeState.bpm}
        onChange={e => onBpmChange(parseInt(e.target.value))}
        className={cn(
          'h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary',
          sliderWidth
        )}
        aria-label="Metronome BPM"
      />
      <span
        className={cn(
          'text-xs font-mono text-center tabular-nums text-foreground',
          bpmDisplayWidth
        )}
      >
        {metronomeState.bpm}
      </span>
    </div>
  );
});

MetronomeControls.displayName = 'MetronomeControls';
