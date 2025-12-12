import React, { memo } from 'react';
import { Badge } from '@/components/primitives';
import { getBandStatusVariant, type BandStatus } from '@/lib/statusConfig';

interface StatusBadgeProps {
  status: BandStatus;
  className?: string;
}

/**
 * StatusBadge - Display a band's official song status badge
 *
 * Uses semantic color variants from shared config:
 * - 'Performance Ready' → success (green)
 * - 'In Progress' → info (blue)
 * - 'To Learn' → warning (amber)
 */
export const StatusBadge: React.FC<StatusBadgeProps> = memo(function StatusBadge({
  status,
  className,
}) {
  return (
    <Badge variant={getBandStatusVariant(status)} className={className}>
      {status}
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';
