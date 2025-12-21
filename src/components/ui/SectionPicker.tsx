import React, { memo, useCallback } from 'react';
import { Loader2, Music2 } from 'lucide-react';
import { useSongSections } from '@/hooks/useSongSections';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface SectionPickerProps {
  /** Song ID to load sections for */
  songId: string | null;
  /** Band ID for section loading */
  bandId: string | null;
  /** Currently selected section IDs */
  selectedSectionIds: string[];
  /** Called when selection changes */
  onSelectionChange: (sectionIds: string[]) => void;
  /** Optional className */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Chip-based section selection component for selecting which sections
 * were practiced in a practice session.
 *
 * - Loads sections for the specified song using useSongSections hook
 * - Displays sections as toggleable chips sorted by displayOrder
 * - Supports keyboard navigation (Tab to move, Enter/Space to toggle)
 * - Shows loading, empty, and error states appropriately
 */
export const SectionPicker: React.FC<SectionPickerProps> = memo(function SectionPicker({
  songId,
  bandId,
  selectedSectionIds,
  onSelectionChange,
  className,
}) {
  const { sections, isLoading, error } = useSongSections(songId, bandId);

  const toggleSection = useCallback(
    (sectionId: string) => {
      if (selectedSectionIds.includes(sectionId)) {
        onSelectionChange(selectedSectionIds.filter(id => id !== sectionId));
      } else {
        onSelectionChange([...selectedSectionIds, sectionId]);
      }
    },
    [selectedSectionIds, onSelectionChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, sectionId: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSection(sectionId);
      }
    },
    [toggleSection]
  );

  // No song selected
  if (!songId) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading sections...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('text-sm text-destructive', className)}>
        Failed to load sections
      </div>
    );
  }

  // Empty state - no sections defined
  if (sections.length === 0) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Music2 className="h-4 w-4" />
        <span className="text-sm">No sections defined for this song</span>
      </div>
    );
  }

  // Render section chips
  return (
    <div
      className={cn('flex flex-wrap gap-2', className)}
      role="group"
      aria-label="Select sections practiced"
    >
      {sections.map(section => {
        const isSelected = selectedSectionIds.includes(section.id);
        return (
          <button
            key={section.id}
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            tabIndex={0}
            onClick={() => toggleSection(section.id)}
            onKeyDown={e => handleKeyDown(e, section.id)}
            className={cn(
              'inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isSelected
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
          >
            {section.name}
          </button>
        );
      })}
    </div>
  );
});

SectionPicker.displayName = 'SectionPicker';
