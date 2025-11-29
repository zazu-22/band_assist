import React, { memo } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/primitives';

// =============================================================================
// TYPES
// =============================================================================

export interface SetlistActionBarProps {
  /** Callback when Add Song button is clicked */
  onAddSong: () => void;
  /** Callback when AI Suggestions button is clicked */
  onAiSuggestions: () => void;
  /** Whether AI suggestions are currently loading */
  isLoadingSuggestions: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * SetlistActionBar - Action buttons for adding songs and AI suggestions
 *
 * Design System Alignment:
 * - Section title: text-lg font-serif text-foreground
 * - Button gaps and sizing from design system
 */
export const SetlistActionBar = memo(function SetlistActionBar({
  onAddSong,
  onAiSuggestions,
  isLoadingSuggestions,
}: SetlistActionBarProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-lg font-serif text-foreground">Songs</h3>
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={onAiSuggestions}
          disabled={isLoadingSuggestions}
          className="gap-2"
        >
          <Sparkles size={16} className={isLoadingSuggestions ? 'animate-spin' : ''} />
          {isLoadingSuggestions ? 'Thinking...' : 'AI Suggestions'}
        </Button>
        <Button onClick={onAddSong} className="gap-2">
          <Plus size={18} />
          Add Song
        </Button>
      </div>
    </div>
  );
});

SetlistActionBar.displayName = 'SetlistActionBar';
