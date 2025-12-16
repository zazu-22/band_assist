import React, { memo } from 'react';
import { User, Music2, Coffee, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/primitives';
import { cn } from '@/lib/utils';
import type { SectionAssignment, AssignmentStatus } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface YourAssignmentBarProps {
  /** Current user's assignment for the active section */
  assignment: SectionAssignment | null;
  /** Name of the current section */
  sectionName?: string;
  /** Optional className */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_CONFIG: Record<AssignmentStatus, {
  icon: React.ElementType;
  label: string;
  variant: 'default' | 'secondary' | 'outline';
  className: string;
}> = {
  playing: {
    icon: Music2,
    label: 'Playing',
    variant: 'default',
    className: 'bg-success/10 text-success border-success/30',
  },
  resting: {
    icon: Coffee,
    label: 'Resting',
    variant: 'secondary',
    className: 'bg-muted text-muted-foreground',
  },
  optional: {
    icon: HelpCircle,
    label: 'Optional',
    variant: 'outline',
    className: 'bg-warning/10 text-warning border-warning/30',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Displays the current user's assignment for the active section in Practice Room.
 * Shows role, status, and any notes for the assignment.
 */
export const YourAssignmentBar: React.FC<YourAssignmentBarProps> = memo(function YourAssignmentBar({
  assignment,
  sectionName,
  className,
}) {
  // Don't render if no assignment
  if (!assignment) {
    return null;
  }

  const statusConfig = STATUS_CONFIG[assignment.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2 bg-card/50 border-b border-border',
        className
      )}
    >
      {/* User indicator */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
          <User className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Your Part
        </span>
      </div>

      {/* Section name (if provided) */}
      {sectionName && (
        <>
          <span className="text-muted-foreground/50">|</span>
          <span className="text-sm text-muted-foreground">
            {sectionName}
          </span>
        </>
      )}

      {/* Role */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {assignment.role}
        </span>
      </div>

      {/* Status badge */}
      <Badge
        variant={statusConfig.variant}
        className={cn('gap-1', statusConfig.className)}
      >
        <StatusIcon className="h-3 w-3" />
        {statusConfig.label}
      </Badge>

      {/* Notes (truncated) */}
      {assignment.notes && (
        <span
          className="text-xs text-muted-foreground italic truncate max-w-[200px]"
          title={assignment.notes}
        >
          {assignment.notes}
        </span>
      )}
    </div>
  );
});

YourAssignmentBar.displayName = 'YourAssignmentBar';
