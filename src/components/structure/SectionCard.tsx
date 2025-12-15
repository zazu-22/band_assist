import React, { memo } from 'react';
import { Edit3, Trash2, Music2, FileText, UserPlus } from 'lucide-react';
import type { SongSection, SectionAssignment, AssignmentStatusSummary, BandMember } from '@/types';
import { Button } from '@/components/primitives/button';
import { cn } from '@/lib/utils';
import { AssignmentList } from './AssignmentList';

interface SectionCardProps {
  section: SongSection;
  /** Assignments for this section */
  assignments: SectionAssignment[];
  /** Status summary for display in header */
  statusSummary: AssignmentStatusSummary;
  /** Current user's member ID (for highlighting in assignment list) */
  currentUserMemberId?: string;
  /** Band members (for assignment form) */
  members: BandMember[];
  onEdit: (section: SongSection) => void;
  onDelete: (section: SongSection) => void;
  /** Callback when editing an assignment */
  onEditAssignment?: (assignment: SectionAssignment) => void;
  /** Callback when adding a new assignment */
  onAddAssignment?: (sectionId: string) => void;
}

/**
 * Displays a single song section with its metadata and assignments.
 * Shows name, bar range, source indicator, assignment summary, and action buttons.
 */
export const SectionCard: React.FC<SectionCardProps> = memo(function SectionCard({
  section,
  assignments,
  statusSummary,
  currentUserMemberId,
  members: _members, // Reserved for future use (e.g., avatar color display)
  onEdit,
  onDelete,
  onEditAssignment,
  onAddAssignment,
}) {
  const isGpMarker = section.source === 'gp_marker';

  return (
    <div
      className={cn(
        'group bg-card border border-border rounded-lg p-4',
        'hover:border-primary/50 transition-colors',
        'border-l-[3px]',
        isGpMarker ? 'border-l-info' : 'border-l-primary'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Section Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-semibold text-foreground truncate">{section.name}</h4>
            {/* Source indicator */}
            <span
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide',
                isGpMarker
                  ? 'bg-info/10 text-info'
                  : 'bg-muted text-muted-foreground'
              )}
              title={isGpMarker ? 'Extracted from Guitar Pro file' : 'Manually created'}
            >
              {isGpMarker ? (
                <>
                  <Music2 size={10} />
                  GP
                </>
              ) : (
                <>
                  <FileText size={10} />
                  Manual
                </>
              )}
            </span>
            {/* Status summary */}
            {statusSummary.total > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                {statusSummary.playing > 0 && `${statusSummary.playing} Playing`}
                {statusSummary.playing > 0 && statusSummary.resting > 0 && ', '}
                {statusSummary.resting > 0 && `${statusSummary.resting} Resting`}
                {(statusSummary.playing > 0 || statusSummary.resting > 0) && statusSummary.optional > 0 && ', '}
                {statusSummary.optional > 0 && `${statusSummary.optional} Optional`}
              </span>
            )}
          </div>

          {/* Bar range */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="font-mono tabular-nums">
              Bars {section.startBar}-{section.endBar}
            </span>
            <span className="text-xs">
              ({section.barCount} {section.barCount === 1 ? 'bar' : 'bars'})
            </span>
          </div>

          {/* Color indicator if present */}
          {section.color && (
            <div className="mt-2 flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full border border-border"
                style={{ backgroundColor: section.color }}
                title={`Section color: ${section.color}`}
              />
              <span className="text-xs text-muted-foreground">{section.color}</span>
            </div>
          )}

          {/* Assignments section */}
          {assignments.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <AssignmentList
                assignments={assignments}
                currentUserMemberId={currentUserMemberId}
                onEdit={onEditAssignment}
                editable={!!onEditAssignment}
                compact
              />
            </div>
          )}
        </div>

        {/* Action Buttons - visible on hover or focus for accessibility */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          {onAddAssignment && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onAddAssignment(section.id)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label={`Add assignment to ${section.name}`}
            >
              <UserPlus size={14} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(section)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Edit section ${section.name}`}
          >
            <Edit3 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(section)}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label={`Delete section ${section.name}`}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
});

SectionCard.displayName = 'SectionCard';
