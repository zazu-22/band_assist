import React, { memo, useCallback, useMemo, useId } from 'react';
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react';
import { Button, Slider, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/primitives';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface VolumeControlProps {
  /** Current volume value (0-1) */
  value: number;
  /** Callback when volume changes */
  onChange: (value: number) => void;
  /** Whether the audio is muted */
  muted?: boolean;
  /** Callback when mute is toggled */
  onMuteToggle?: () => void;
  /** Accessible label for the control */
  label?: string;
  /** Display variant */
  variant?: 'compact' | 'expanded';
  /** Additional class names */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const VOLUME_STEP = 0.01;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Returns the appropriate volume icon level string based on volume and mute state.
 */
function getVolumeLevel(volume: number, muted: boolean): 'muted' | 'low' | 'medium' | 'high' {
  if (muted || volume === 0) {
    return 'muted';
  }
  if (volume <= 0.33) {
    return 'low';
  }
  if (volume <= 0.66) {
    return 'medium';
  }
  return 'high';
}

/**
 * Volume icon component that renders the appropriate icon based on level.
 */
function VolumeIcon({ level, size }: { level: 'muted' | 'low' | 'medium' | 'high'; size: number }) {
  switch (level) {
    case 'muted':
      return <VolumeX size={size} />;
    case 'low':
      return <Volume size={size} />;
    case 'medium':
      return <Volume1 size={size} />;
    case 'high':
      return <Volume2 size={size} />;
  }
}

/**
 * Returns the display percentage for the volume value.
 */
function getVolumePercentage(volume: number): number {
  return Math.round(volume * 100);
}

// =============================================================================
// COMPONENT
// =============================================================================

export const VolumeControl = memo(function VolumeControl({
  value,
  onChange,
  muted = false,
  onMuteToggle,
  label = 'Volume',
  variant = 'compact',
  className,
}: VolumeControlProps) {
  // Generate unique IDs for accessibility
  const sliderId = useId();
  const labelId = `${sliderId}-label`;

  // Determine icon level based on volume and mute state
  const volumeLevel = useMemo(() => getVolumeLevel(value, muted), [value, muted]);

  // Display percentage
  const percentage = useMemo(() => getVolumePercentage(value), [value]);

  // Handle slider change (Radix Slider returns array)
  const handleSliderChange = useCallback(
    (values: number[]) => {
      onChange(values[0]);
    },
    [onChange]
  );

  // Handle keyboard shortcuts on slider
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // M key to mute/unmute
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        onMuteToggle?.();
      }
    },
    [onMuteToggle]
  );

  // Effective displayed value (show 0 when muted for visual feedback)
  const displayValue = muted ? 0 : value;

  // Determine tooltip text
  const tooltipText = muted ? 'Unmute' : 'Mute';

  if (variant === 'expanded') {
    return (
      <div
        className={cn(
          'flex flex-col gap-2 p-3 bg-card rounded-lg border border-border',
          className
        )}
        role="group"
        aria-labelledby={labelId}
      >
        <div className="flex items-center justify-between">
          <span
            id={labelId}
            className="text-xs font-bold text-muted-foreground uppercase tracking-wide"
          >
            {label}
          </span>
          <span className="text-xs font-mono tabular-nums text-muted-foreground">
            {percentage}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onMuteToggle}
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={tooltipText}
                  aria-pressed={muted}
                >
                  <VolumeIcon level={volumeLevel} size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{tooltipText} (M)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Slider
            id={sliderId}
            value={[displayValue]}
            onValueChange={handleSliderChange}
            onKeyDown={handleKeyDown}
            min={0}
            max={1}
            step={VOLUME_STEP}
            aria-label={label}
            aria-valuetext={`${percentage}%${muted ? ' (muted)' : ''}`}
            className="flex-1"
          />
        </div>
      </div>
    );
  }

  // Compact variant (default)
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="group"
      aria-label={label}
    >
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onMuteToggle}
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={tooltipText}
              aria-pressed={muted}
            >
              <VolumeIcon level={volumeLevel} size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{tooltipText} (M)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Slider
        id={sliderId}
        value={[displayValue]}
        onValueChange={handleSliderChange}
        onKeyDown={handleKeyDown}
        min={0}
        max={1}
        step={VOLUME_STEP}
        aria-label={label}
        aria-valuetext={`${percentage}%${muted ? ' (muted)' : ''}`}
        className="w-20 sm:w-24"
      />
    </div>
  );
});

VolumeControl.displayName = 'VolumeControl';
