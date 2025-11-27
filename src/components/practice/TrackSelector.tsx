import { memo } from 'react';
import { ChevronDown, Volume2, VolumeX, Star } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';
import type { TrackInfo } from './types';

export interface TrackSelectorProps {
  tracks: TrackInfo[];
  currentTrackIndex: number;
  onSelectTrack: (index: number) => void;
  onToggleMute: (index: number) => void;
  onToggleSolo: (index: number) => void;
}

export const TrackSelector = memo(function TrackSelector({
  tracks,
  currentTrackIndex,
  onSelectTrack,
  onToggleMute,
  onToggleSolo,
}: TrackSelectorProps) {
  const currentTrack = tracks[currentTrackIndex];

  if (!currentTrack || tracks.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 text-xs font-medium max-w-[140px]"
                data-testid="track-selector"
              >
                <div
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    currentTrack.isMute ? 'bg-destructive' : 'bg-primary'
                  )}
                />
                <span className="truncate">{currentTrack.name}</span>
                <ChevronDown size={14} className="shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Select track to display</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent
        align="end"
        className="w-56"
        data-testid="track-dropdown"
      >
        {tracks.map((track, index) => (
          <DropdownMenuItem
            key={index}
            className={cn(
              'flex items-center justify-between gap-2 py-2',
              index === currentTrackIndex && 'bg-muted'
            )}
            onSelect={(e) => e.preventDefault()}
          >
            <button
              className="flex-1 flex items-center gap-2 text-left"
              onClick={() => onSelectTrack(index)}
            >
              <div
                className={cn(
                  'w-2.5 h-2.5 rounded-full shrink-0',
                  index === currentTrackIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              />
              <span className={cn(
                'truncate text-sm',
                index === currentTrackIndex && 'font-semibold'
              )}>
                {track.name}
              </span>
            </button>

            <div className="flex gap-1 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMute(index);
                }}
                className={cn(
                  'p-1 rounded text-xs font-bold transition-colors',
                  track.isMute
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                )}
                title={track.isMute ? 'Unmute' : 'Mute'}
              >
                {track.isMute ? <VolumeX size={12} /> : <Volume2 size={12} />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSolo(index);
                }}
                className={cn(
                  'p-1 rounded text-xs font-bold transition-colors',
                  track.isSolo
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                )}
                title={track.isSolo ? 'Unsolo' : 'Solo'}
              >
                <Star size={12} className={track.isSolo ? 'fill-current' : ''} />
              </button>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

TrackSelector.displayName = 'TrackSelector';
