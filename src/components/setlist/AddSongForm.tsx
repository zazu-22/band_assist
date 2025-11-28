import React, { memo, useState, useCallback } from 'react';
import { Button, Card, CardContent, Input } from '@/components/primitives';

// =============================================================================
// TYPES
// =============================================================================

export interface AddSongFormProps {
  /** Callback when form is submitted with a title */
  onSubmit: (title: string) => void;
  /** Callback when form is cancelled */
  onCancel: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * AddSongForm - Card-based form for adding new songs
 *
 * Design System Alignment:
 * - Uses Card/CardContent components
 * - Has slide-in animation (animate-slide-in-from-top)
 */
export const AddSongForm = memo(function AddSongForm({
  onSubmit,
  onCancel,
}: AddSongFormProps) {
  const [title, setTitle] = useState('');

  const handleSubmit = useCallback(() => {
    if (title.trim()) {
      onSubmit(title.trim());
      setTitle('');
    }
  }, [title, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <Card className="overflow-hidden animate-slide-in-from-top animation-forwards">
      <CardContent className="pt-6">
        <label
          htmlFor="new-song-title"
          className="block text-sm font-medium text-muted-foreground mb-2"
        >
          Song Title
        </label>
        <div className="flex gap-3">
          <Input
            id="new-song-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g., Sharp Dressed Man"
            className="flex-1"
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <Button onClick={handleSubmit}>Add</Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

AddSongForm.displayName = 'AddSongForm';
