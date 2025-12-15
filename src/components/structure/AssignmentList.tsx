import React, { memo } from 'react';
import { User, Music2 } from 'lucide-react';
import type { SectionAssignment } from '@/types';
import { ActivityIndicator } from './ActivityIndicator';
import { cn } from '@/lib/utils';

interface AssignmentListProps {
  /** Assignments to display */
  assignments: SectionAssignment[];
  /** Current user's member ID (for highlighting) */
  currentUserMemberId?: string;
  /** Callback when assignment is clicked for editing */
  onEdit?: (assignment: SectionAssignment) => void;
  /** Whether edit/delete actions are available */
  editable?: boolean;
  /** Compact display mode (less padding, smaller text) */
  compact?: boolean;
}

/**
 * Displays a list of member assignments for a section.
 * Highlights the current user's assignment and shows status indicators.
 */
export const AssignmentList: React.FC<AssignmentListProps> = memo(function AssignmentList({
  assignments,
  currentUserMemberId,
  onEdit,
  editable = false,
  compact = false,
}) {
  if (assignments.length === 0) {
    return (
      <div className={cn(
        'text-muted-foreground italic',
        compact ? 'text-xs' : 'text-sm'
      )}>
        No assignments yet
      </div>
    );
  }

  return (
    <ul className={cn('space-y-1', compact ? 'text-xs' : 'text-sm')}>
      {assignments.map(assignment => {
        const isCurrentUser = assignment.memberId === currentUserMemberId;

        return (
          <li
            key={assignment.id}
            className={cn(
              'flex items-center gap-2 rounded px-2 py-1',
              isCurrentUser && 'bg-primary/10 border border-primary/20',
              editable && 'cursor-pointer hover:bg-muted/50',
            )}
            onClick={editable && onEdit ? () => onEdit(assignment) : undefined}
            role={editable ? 'button' : undefined}
            tabIndex={editable ? 0 : undefined}
            onKeyDown={editable && onEdit ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEdit(assignment);
              }
            } : undefined}
          >
            {/* Status indicator */}
            <ActivityIndicator status={assignment.status} size={compact ? 'sm' : 'md'} />

            {/* Member name with avatar color */}
            <span className="flex items-center gap-1 min-w-0">
              <User size={compact ? 12 : 14} className="shrink-0 text-muted-foreground" />
              <span className={cn(
                'truncate',
                isCurrentUser && 'font-medium text-primary'
              )}>
                {assignment.memberName || 'Unknown'}
              </span>
            </span>

            {/* Role */}
            <span className="text-muted-foreground flex items-center gap-1 shrink-0">
              <Music2 size={compact ? 10 : 12} />
              {assignment.role}
            </span>

            {/* Notes indicator */}
            {assignment.notes && (
              <span
                className="text-muted-foreground/60 truncate max-w-[100px]"
                title={assignment.notes}
              >
                - {assignment.notes}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
});

AssignmentList.displayName = 'AssignmentList';
