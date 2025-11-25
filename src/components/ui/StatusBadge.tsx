import React from 'react';
import { Badge } from '@/components/primitives';
import type { Song } from '@/types';

type SongStatus = Song['status'];

interface StatusBadgeProps {
  status: SongStatus;
  className?: string;
}

const statusConfig: Record<
  SongStatus,
  { label: string; variant: 'success' | 'info' | 'warning' }
> = {
  'Performance Ready': {
    label: 'Performance Ready',
    variant: 'success',
  },
  'In Progress': {
    label: 'In Progress',
    variant: 'info',
  },
  'To Learn': {
    label: 'To Learn',
    variant: 'warning',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
}) => {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
};
