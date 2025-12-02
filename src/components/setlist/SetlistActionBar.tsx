import React, { memo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/primitives';

// =============================================================================
// TYPES
// =============================================================================

export interface SetlistActionBarProps {
  /** Callback when Add Song button is clicked */
  onAddSong: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * SetlistActionBar - Action buttons for adding songs
 *
 * Design System Alignment:
 * - Section title: text-lg font-serif text-foreground
 * - Button gaps and sizing from design system
 */
export const SetlistActionBar = memo(function SetlistActionBar({
  onAddSong,
}: SetlistActionBarProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-lg font-serif text-foreground">Songs</h3>
      <Button onClick={onAddSong} className="gap-2">
        <Plus size={18} />
        Add Song
      </Button>
    </div>
  );
});

SetlistActionBar.displayName = 'SetlistActionBar';
