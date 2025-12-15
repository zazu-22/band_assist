import React, { memo } from 'react';
import type { SongSection } from '@/types';
import { SectionCard } from './SectionCard';
import { EmptyState } from '@/components/ui';
import { Layers } from 'lucide-react';

interface SectionListProps {
  sections: SongSection[];
  isLoading: boolean;
  onEdit: (section: SongSection) => void;
  onDelete: (section: SongSection) => void;
  hasGpChart: boolean;
}

/**
 * Renders a list of song sections with empty state handling.
 */
export const SectionList: React.FC<SectionListProps> = memo(function SectionList({
  sections,
  isLoading,
  onEdit,
  onDelete,
  hasGpChart,
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {/* Loading skeleton */}
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-20 bg-muted/30 rounded-lg animate-pulse border border-border"
          />
        ))}
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No sections defined"
        description={
          hasGpChart
            ? 'Click "Extract from GP" to auto-detect sections from the Guitar Pro file, or add sections manually.'
            : 'Add sections manually to define the structure of this song.'
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {sections.map(section => (
        <SectionCard
          key={section.id}
          section={section}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
});

SectionList.displayName = 'SectionList';
