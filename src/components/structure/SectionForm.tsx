import React, { useState, useCallback, useEffect, memo } from 'react';
import type { SongSection } from '@/types';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/primitives/dialog';
import { toast } from '@/components/ui';

interface SectionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SectionFormData) => Promise<void>;
  /** Existing section for editing, or null for creating new */
  section: SongSection | null;
  /** Existing sections for validation (prevent overlapping) */
  existingSections: SongSection[];
}

export interface SectionFormData {
  name: string;
  startBar: number;
  endBar: number;
  color?: string;
}

/**
 * Dialog form for creating or editing a song section.
 * Validates that end bar >= start bar and prevents overlapping sections.
 */
export const SectionForm: React.FC<SectionFormProps> = memo(function SectionForm({
  isOpen,
  onClose,
  onSubmit,
  section,
  existingSections,
}) {
  const isEditing = section !== null;

  const [name, setName] = useState('');
  const [startBar, setStartBar] = useState(1);
  const [endBar, setEndBar] = useState(1);
  const [color, setColor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; bars?: string }>({});

  // Initialize form when section changes
  useEffect(() => {
    if (section) {
      setName(section.name);
      setStartBar(section.startBar);
      setEndBar(section.endBar);
      setColor(section.color || '');
    } else {
      // Default for new section
      setName('');
      setStartBar(1);
      setEndBar(1);
      setColor('');
    }
    setErrors({});
  }, [section, isOpen]);

  const validate = useCallback((): boolean => {
    const newErrors: { name?: string; bars?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Section name is required';
    }

    if (startBar < 1) {
      newErrors.bars = 'Start bar must be at least 1';
    } else if (endBar < startBar) {
      newErrors.bars = 'End bar must be greater than or equal to start bar';
    }

    // Check for overlapping sections (excluding current section if editing)
    const otherSections = existingSections.filter(s => s.id !== section?.id);
    const overlapping = otherSections.find(
      s =>
        (startBar >= s.startBar && startBar <= s.endBar) ||
        (endBar >= s.startBar && endBar <= s.endBar) ||
        (startBar <= s.startBar && endBar >= s.endBar)
    );

    if (overlapping) {
      newErrors.bars = `Overlaps with "${overlapping.name}" (bars ${overlapping.startBar}-${overlapping.endBar})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, startBar, endBar, existingSections, section?.id]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) {
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit({
          name: name.trim(),
          startBar,
          endBar,
          color: color.trim() || undefined,
        });
        onClose();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to save section'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [validate, name, startBar, endBar, color, onSubmit, onClose]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Section' : 'Add Section'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the section details below.'
              : 'Define a new section with a name and bar range.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section Name */}
          <div className="space-y-2">
            <Label htmlFor="section-name">Section Name</Label>
            <Input
              id="section-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Intro, Verse 1, Chorus"
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Bar Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-bar">Start Bar</Label>
              <Input
                id="start-bar"
                type="number"
                min={1}
                value={startBar}
                onChange={e => setStartBar(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-bar">End Bar</Label>
              <Input
                id="end-bar"
                type="number"
                min={1}
                value={endBar}
                onChange={e => setEndBar(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          {errors.bars && (
            <p className="text-sm text-destructive">{errors.bars}</p>
          )}

          {/* Color (optional) */}
          <div className="space-y-2">
            <Label htmlFor="section-color">Color (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="section-color"
                type="color"
                value={color || '#6366f1'}
                onChange={e => setColor(e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={color}
                onChange={e => setColor(e.target.value)}
                placeholder="#6366f1"
                className="flex-1"
              />
              {color && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setColor('')}
                  className="text-muted-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Section'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

SectionForm.displayName = 'SectionForm';
