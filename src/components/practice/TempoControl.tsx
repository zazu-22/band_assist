import { memo, useState, useCallback } from 'react';
import { Timer, RotateCcw } from 'lucide-react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';

export interface TempoControlProps {
  currentBPM: number;
  originalTempo: number;
  currentSpeed: number;
  onSetBPM: (bpm: number) => void;
  onReset: () => void;
}

export const TempoControl = memo(function TempoControl({
  currentBPM,
  originalTempo,
  currentSpeed,
  onSetBPM,
  onReset,
}: TempoControlProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const minBPM = Math.round(originalTempo * 0.25);
  const maxBPM = Math.round(originalTempo * 2.0);
  const isModified = currentSpeed !== 1.0;

  const handleStartEdit = useCallback(() => {
    setInputValue(currentBPM.toString());
    setIsEditing(true);
  }, [currentBPM]);

  const handleSubmitEdit = useCallback(() => {
    // Strict validation: trim whitespace, check for valid positive integer format
    const trimmed = inputValue.trim();

    // Reject empty, non-numeric, decimal, or negative inputs
    if (!trimmed || !/^\d+$/.test(trimmed)) {
      // Revert to current BPM on invalid input
      setIsEditing(false);
      return;
    }

    const newBPM = parseInt(trimmed, 10);

    // Additional NaN check (should not happen with regex, but defensive)
    if (isNaN(newBPM) || !isFinite(newBPM)) {
      setIsEditing(false);
      return;
    }

    const clampedBPM = Math.max(minBPM, Math.min(maxBPM, newBPM));
    onSetBPM(clampedBPM);
    setIsEditing(false);
  }, [inputValue, minBPM, maxBPM, onSetBPM]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmitEdit();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
      }
    },
    [handleSubmitEdit]
  );

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <TooltipProvider delayDuration={100}>
        {/* BPM Display / Input */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleStartEdit}
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded',
                'bg-muted hover:bg-muted/80 transition-colors',
                'cursor-pointer shrink-0'
              )}
              aria-label="Click to edit BPM"
            >
              <Timer size={14} className="text-muted-foreground hidden sm:block" />
              {isEditing ? (
                <input
                  type="number"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onBlur={handleSubmitEdit}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className={cn(
                    'w-12 bg-background border border-primary rounded px-1',
                    'text-sm font-mono tabular-nums text-center',
                    'focus:outline-none focus:ring-1 focus:ring-primary'
                  )}
                  onClick={e => e.stopPropagation()}
                  data-testid="bpm-input"
                />
              ) : (
                <span className="text-sm font-mono tabular-nums font-semibold text-foreground">
                  {currentBPM}
                </span>
              )}
              <span className="text-xs text-muted-foreground">BPM</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to enter BPM directly</p>
          </TooltipContent>
        </Tooltip>

        {/* Reset Button - icon only on mobile */}
        {isModified && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-8 w-8 sm:h-7 sm:w-auto sm:px-2 p-0 text-xs gap-1 shrink-0"
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset to original tempo ({originalTempo} BPM)</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* BPM Slider - hidden on mobile to save space */}
        <div className="hidden sm:flex items-center gap-2 bg-muted rounded px-2 py-1">
          <input
            type="range"
            min={minBPM}
            max={maxBPM}
            step="1"
            value={currentBPM}
            onChange={e => onSetBPM(parseInt(e.target.value))}
            className="w-24 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
            aria-label="Tempo slider"
            data-testid="bpm-slider"
          />
          <div className="flex gap-2 text-[10px] text-muted-foreground font-mono tabular-nums">
            <span>{minBPM}</span>
            <span className="text-foreground font-semibold">{currentBPM}</span>
            <span>{maxBPM}</span>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
});

TempoControl.displayName = 'TempoControl';
