import React, { memo } from 'react';
import { Badge } from '@/components/primitives';
import type { Song } from '@/types';

type SongStatus = Song['status'];

interface StatusBadgeProps {
  status: SongStatus;
  className?: string;
}

type BadgeVariant = 'success' | 'info' | 'warning';

// Maps song status to Badge variant - status value is used directly as label
const STATUS_VARIANT_MAP = {
  'Performance Ready': 'success',
  'In Progress': 'info',
  'To Learn': 'warning',
} as const satisfies Record<SongStatus, BadgeVariant>;

export const StatusBadge: React.FC<StatusBadgeProps> = memo(function StatusBadge({
  status,
  className,
}) {
  return (
    <Badge variant={STATUS_VARIANT_MAP[status]} className={className}>
      {status}
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';
