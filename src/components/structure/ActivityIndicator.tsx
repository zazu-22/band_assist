import React, { memo } from 'react';
import type { AssignmentStatus } from '@/types';
import { cn } from '@/lib/utils';

interface ActivityIndicatorProps {
  status: AssignmentStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/**
 * Visual indicator for assignment status.
 * Uses semantic color tokens defined in src/index.css:
 * - text-success: defined at line 145 (@theme inline) maps to --color-success
 * - text-warning: defined at line 147 (@theme inline) maps to --color-warning
 * - text-muted-foreground: standard shadcn/ui token
 *
 * Status indicators:
 * - Playing: filled circle in success green
 * - Optional: half-filled circle in warning amber
 * - Resting: empty circle in muted gray
 */
export const ActivityIndicator: React.FC<ActivityIndicatorProps> = memo(function ActivityIndicator({
  status,
  size = 'md',
  showLabel = false,
}) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  } as const;

  const config = {
    playing: {
      symbol: '\u25CF', // Filled circle
      colorClass: 'text-success',  // Defined in src/index.css @theme inline
      label: 'Playing',
    },
    optional: {
      symbol: '\u25D0', // Half-filled circle
      colorClass: 'text-warning',  // Defined in src/index.css @theme inline
      label: 'Optional',
    },
    resting: {
      symbol: '\u25CB', // Empty circle
      colorClass: 'text-muted-foreground',
      label: 'Resting',
    },
  };

  const { symbol, colorClass, label } = config[status];

  return (
    <span
      className={cn('inline-flex items-center gap-1', sizeClasses[size])}
      title={label}
      aria-label={label}
    >
      <span className={colorClass} aria-hidden="true">
        {symbol}
      </span>
      {showLabel && <span className="text-muted-foreground">{label}</span>}
    </span>
  );
});

ActivityIndicator.displayName = 'ActivityIndicator';
