import React, { memo, useCallback, useMemo } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  Badge,
} from '@/components/primitives';
import { cn } from '@/lib/utils';
import type { SongSection } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface SectionPickerProps {
  /** Available sections to choose from */
  sections: SongSection[];
  /** Currently selected section IDs */
  selectedIds: string[];
  /** Callback when selection changes */
  onChange: (ids: string[]) => void;
  /** Disable the picker */
  disabled?: boolean;
  /** Optional className */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Multi-select section picker for LogPracticeModal.
 * Displays sections in a dropdown with checkboxes for multi-selection.
 */
export const SectionPicker: React.FC<SectionPickerProps> = memo(function SectionPicker({
  sections,
  selectedIds,
  onChange,
  disabled = false,
  className,
}) {
  // Build a map for quick lookup
  const sectionMap = useMemo(() => {
    return new Map(sections.map(s => [s.id, s]));
  }, [sections]);

  // Get selected section names for display
  const selectedSections = useMemo(() => {
    return selectedIds
      .map(id => sectionMap.get(id))
      .filter((s): s is SongSection => s !== undefined);
  }, [selectedIds, sectionMap]);

  // Toggle a section's selection
  const handleToggle = useCallback((sectionId: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedIds, sectionId]);
    } else {
      onChange(selectedIds.filter(id => id !== sectionId));
    }
  }, [selectedIds, onChange]);

  // Select all sections
  const handleSelectAll = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(sections.map(s => s.id));
  }, [sections, onChange]);

  // Clear all selections
  const handleClearAll = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange([]);
  }, [onChange]);

  // Remove a specific selection (from badge)
  const handleRemove = useCallback((sectionId: string) => {
    onChange(selectedIds.filter(id => id !== sectionId));
  }, [selectedIds, onChange]);

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className="w-full justify-between h-auto min-h-11 sm:min-h-9"
          >
            <span className="text-left truncate">
              {selectedIds.length === 0
                ? 'Select sections...'
                : `${selectedIds.length} section${selectedIds.length === 1 ? '' : 's'} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[280px]" align="start">
          {/* Action buttons */}
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              disabled={selectedIds.length === sections.length}
              className="h-7 text-xs"
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={selectedIds.length === 0}
              className="h-7 text-xs"
            >
              Clear All
            </Button>
          </div>

          {/* Section list */}
          <div className="max-h-[200px] overflow-y-auto">
            {sections.map((section) => {
              const isSelected = selectedIds.includes(section.id);
              return (
                <DropdownMenuCheckboxItem
                  key={section.id}
                  checked={isSelected}
                  onCheckedChange={(checked) => handleToggle(section.id, checked)}
                  className="cursor-pointer"
                >
                  <span className="flex-1">{section.name}</span>
                  <span className="text-xs text-muted-foreground font-mono tabular-nums ml-2">
                    {section.startBar}-{section.endBar}
                  </span>
                </DropdownMenuCheckboxItem>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Selected sections display as badges */}
      {selectedSections.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedSections.map((section) => (
            <Badge
              key={section.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {section.name}
              <button
                type="button"
                onClick={() => handleRemove(section.id)}
                className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                aria-label={`Remove ${section.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
});

SectionPicker.displayName = 'SectionPicker';
