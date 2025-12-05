import React, { memo } from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import { SongStatusBadges } from '@/components/SongStatusBadges';
import { cn } from '@/lib/utils';
import type { Song, UserSongProgress } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface SetlistItemProps {
  /** Song data to display */
  song: Song;
  /** Position index in the setlist (0-based) */
  index: number;
  /** Whether this item is currently being dragged */
  isDragging: boolean;
  /** Whether this is the current drop target */
  isDropTarget: boolean;
  /** Transform styles for drag animation */
  transformStyle: React.CSSProperties;
  /** Ref callback for position tracking */
  itemRef: (el: HTMLElement | null) => void;
  /** Props to spread on the drag handle element */
  dragHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    'aria-label': string;
  };
  /** Props to spread on the li element for keyboard/ARIA support */
  itemProps: {
    onKeyDown: (e: React.KeyboardEvent) => void;
    tabIndex: number;
    role: string;
    'aria-grabbed': boolean | undefined;
    'aria-dropeffect': 'move' | 'none';
  };
  /** Callback when song title is clicked */
  onSelect: (id: string) => void;
  /** Callback when delete button is clicked */
  onDelete: (id: string) => void;
  /** Whether the current user is a band admin (controls delete button visibility) */
  isAdmin?: boolean;
  /** User's personal learning status for this song (optional) */
  userStatus?: UserSongProgress | null;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * SetlistItem - Individual song item in the setlist
 *
 * Design System Alignment:
 * - Left border accent: border-l-[3px] border-l-primary/60
 * - Typography: font-semibold for title, font-mono tabular-nums for numbers
 * - Hover: hover:bg-muted/30 transition-colors
 * - Staggered animation via animationDelay prop
 * - Delete button visibility on group hover
 */
export const SetlistItem = memo(function SetlistItem({
  song,
  index,
  isDragging,
  isDropTarget,
  transformStyle,
  itemRef,
  dragHandleProps,
  itemProps,
  onSelect,
  onDelete,
  isAdmin = false,
  userStatus: _userStatus,
}: SetlistItemProps) {
  return (
    <li
      ref={itemRef}
      {...itemProps}
      className={cn(
        // Base styles
        'group relative flex items-center gap-4 px-4 py-2.5',
        // Card-like appearance
        'bg-card rounded-xl border border-border',
        // Left accent border (matches Dashboard Practice Queue)
        'border-l-[3px] border-l-primary/60',
        // Hover state
        'hover:bg-muted/30 transition-all duration-200',
        // Motion support
        'motion-reduce:transition-none',
        // Drag states
        isDragging && 'cursor-grabbing',
        isDropTarget && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        // Staggered animation
        'opacity-0 animate-slide-in-from-bottom animation-forwards',
        // Focus visible for keyboard navigation
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        ...transformStyle,
      }}
    >
      {/* Drag handle with proper touch target */}
      <div
        {...dragHandleProps}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <GripVertical size={20} />
      </div>

      {/* Track number */}
      <div className="w-8 text-center font-mono text-muted-foreground text-sm tabular-nums select-none">
        {index + 1}
      </div>

      {/* Song info - clickable */}
      <button
        type="button"
        className="flex-1 text-left cursor-pointer min-w-0"
        onClick={() => onSelect(song.id)}
      >
        <p className="font-semibold text-foreground truncate text-sm group-hover:text-primary transition-colors">
          {song.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{song.key}</span>
          <span className="text-border">•</span>
          <span className="font-mono tabular-nums">{song.bpm} BPM</span>
        </div>
      </button>

      {/* Duration - hidden on mobile */}
      <div className="hidden md:block text-sm font-mono text-muted-foreground px-4 tabular-nums select-none">
        {song.duration}
      </div>

      {/* Status + Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <SongStatusBadges song={song} userStatus={_userStatus} />
        {isAdmin && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    onDelete(song.id);
                  }}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Delete ${song.title}`}
                >
                  <Trash2 size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Song</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </li>
  );
});

SetlistItem.displayName = 'SetlistItem';
