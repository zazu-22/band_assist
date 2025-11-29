import { memo } from 'react';
import { Play, Pause, Square, Repeat } from 'lucide-react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';

export interface PlaybackControlsProps {
  isPlaying: boolean;
  isLooping: boolean;
  disabled?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onToggleLoop: () => void;
}

export const PlaybackControls = memo(function PlaybackControls({
  isPlaying,
  isLooping,
  disabled = false,
  onPlay,
  onPause,
  onStop,
  onToggleLoop,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <TooltipProvider delayDuration={100}>
        {/* Play/Pause Button - primary action, larger and prominent */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={isPlaying ? onPause : onPlay}
              disabled={disabled}
              className={cn(
                'h-11 w-11 sm:h-10 sm:w-10 rounded-full p-0 shrink-0',
                isPlaying
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md'
                  : 'hover:bg-muted'
              )}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isPlaying ? 'Pause' : 'Play'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Stop Button - h-11 ensures 44px touch target on mobile per accessibility guidelines */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onStop}
              disabled={disabled}
              className="h-11 w-11 sm:h-9 sm:w-9 p-0 shrink-0"
              aria-label="Stop"
            >
              <Square size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Stop</p>
          </TooltipContent>
        </Tooltip>

        {/* Loop Button - h-11 ensures 44px touch target on mobile per accessibility guidelines */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleLoop}
              disabled={disabled}
              className={cn(
                'h-11 w-11 sm:h-9 sm:w-9 p-0 shrink-0',
                isLooping && 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
              aria-label={isLooping ? 'Disable loop' : 'Enable loop'}
            >
              <Repeat size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isLooping ? 'Disable loop' : 'Enable loop'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
});

PlaybackControls.displayName = 'PlaybackControls';
