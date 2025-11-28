import React, { memo } from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import { StatusBadge } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Song } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface SetlistItemProps {
  /** Song data to display */
  song: Song;
  /** Position index in the setlist (0-based) */
  index: number;
  /** Whether this item is currently being dragged */
  isDragged: boolean;
  /** Callback when song title is clicked */
  onSelect: (id: string) => void;
  /** Callback when delete button is clicked */
  onDelete: (id: string) => void;
  /** Callback when drag starts */
  onDragStart: (e: React.DragEvent<HTMLLIElement>, index: number) => void;
  /** Callback when dragging over this item */
  onDragOver: (e: React.DragEvent<HTMLElement>, index: number) => void;
  /** Callback when item is dropped */
  onDrop: (e: React.DragEvent<HTMLElement>) => void;
  /** Callback when drag ends */
  onDragEnd: () => void;
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
  isDragged,
  onSelect,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: SetlistItemProps) {
  return (
    <li
      draggable
      onDragStart={e => onDragStart(e, index)}
      onDragOver={e => onDragOver(e, index)}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
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
        isDragged && 'opacity-0 h-0 p-0 border-0 my-0 overflow-hidden',
        // Staggered animation
        'opacity-0 animate-slide-in-from-bottom animation-forwards'
      )}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Drag handle with proper touch target */}
      <div
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-2 touch-none -ml-2"
        aria-label="Drag to reorder"
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
        <StatusBadge status={song.status} />
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
              <p>Remove from setlist</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </li>
  );
});

SetlistItem.displayName = 'SetlistItem';
