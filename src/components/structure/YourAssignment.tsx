import React, { memo } from 'react';
import { Music2, AlertCircle } from 'lucide-react';
import type { SectionAssignment } from '@/types';
import { ActivityIndicator } from './ActivityIndicator';
import { cn } from '@/lib/utils';

interface YourAssignmentProps {
  /** The current user's assignment for a section, or undefined if not assigned */
  assignment?: SectionAssignment;
  /** Whether to show in compact mode */
  compact?: boolean;
}

/**
 * Displays the current logged-in user's assignment for a section.
 * Shows role, status, and any section-specific notes.
 */
export const YourAssignment: React.FC<YourAssignmentProps> = memo(function YourAssignment({
  assignment,
  compact = false,
}) {
  if (!assignment) {
    return (
      <div className={cn(
        'flex items-center gap-2 text-muted-foreground',
        compact ? 'text-xs' : 'text-sm'
      )}>
        <AlertCircle size={compact ? 12 : 14} aria-hidden="true" />
        <span>No assignment for you in this section</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-lg border border-primary/20 bg-primary/5 p-3',
      compact && 'p-2'
    )}>
      <div className={cn(
        'flex items-center gap-3',
        compact ? 'text-xs' : 'text-sm'
      )}>
        {/* Status indicator */}
        <ActivityIndicator status={assignment.status} size={compact ? 'sm' : 'md'} />

        {/* Role */}
        <span className="flex items-center gap-1 font-medium text-primary">
          <Music2 size={compact ? 12 : 14} />
          {assignment.role}
        </span>

        {/* Status label */}
        <span className="text-muted-foreground capitalize">
          ({assignment.status})
        </span>
      </div>

      {/* Notes */}
      {assignment.notes && (
        <p className={cn(
          'mt-2 text-muted-foreground italic border-l-2 border-primary/30 pl-2',
          compact ? 'text-xs' : 'text-sm'
        )}>
          {assignment.notes}
        </p>
      )}
    </div>
  );
});

YourAssignment.displayName = 'YourAssignment';
