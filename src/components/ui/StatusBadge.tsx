import React, { memo } from 'react';
import { Badge } from '@/components/primitives';
import type { Song } from '@/types';

type SongStatus = Song['status'];

interface StatusBadgeProps {
  status: SongStatus;
  className?: string;
}

// Maps song status to Badge variant - status value is used directly as label
const statusVariantMap: Record<SongStatus, 'success' | 'info' | 'warning'> = {
  'Performance Ready': 'success',
  'In Progress': 'info',
  'To Learn': 'warning',
};

export const StatusBadge: React.FC<StatusBadgeProps> = memo(function StatusBadge({
  status,
  className,
}) {
  return (
    <Badge variant={statusVariantMap[status]} className={className}>
      {status}
    </Badge>
  );
});
