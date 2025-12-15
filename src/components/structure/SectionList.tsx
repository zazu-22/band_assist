import React, { memo } from 'react';
import type { SongSection, SectionAssignment, AssignmentStatusSummary, BandMember } from '@/types';
import { SectionCard } from './SectionCard';
import { EmptyState } from '@/components/ui';
import { Layers } from 'lucide-react';

interface SectionListProps {
  sections: SongSection[];
  isLoading: boolean;
  onEdit: (section: SongSection) => void;
  onDelete: (section: SongSection) => void;
  hasGpChart: boolean;
  /** Band members for assignments */
  members: BandMember[];
  /** Function to get assignments for a section */
  getAssignmentsForSection: (sectionId: string) => SectionAssignment[];
  /** Function to get status summary for a section */
  getStatusSummary: (sectionId: string) => AssignmentStatusSummary;
  /** Current user's member ID (for highlighting) */
  currentUserMemberId?: string;
  /** Callback when editing an assignment */
  onEditAssignment?: (assignment: SectionAssignment) => void;
  /** Callback when adding a new assignment */
  onAddAssignment?: (sectionId: string) => void;
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
  members,
  getAssignmentsForSection,
  getStatusSummary,
  currentUserMemberId,
  onEditAssignment,
  onAddAssignment,
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
          assignments={getAssignmentsForSection(section.id)}
          statusSummary={getStatusSummary(section.id)}
          currentUserMemberId={currentUserMemberId}
          members={members}
          onEdit={onEdit}
          onDelete={onDelete}
          onEditAssignment={onEditAssignment}
          onAddAssignment={onAddAssignment}
        />
      ))}
    </div>
  );
});

SectionList.displayName = 'SectionList';
