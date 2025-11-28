import React, { memo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetadataItemProps {
  /** The icon to display */
  icon: LucideIcon;
  /** The label text */
  label: string;
  /** The value to display */
  value: string | number;
  /** Whether to use monospace font for the value (for numbers) */
  mono?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A reusable component for displaying metadata items with an icon, label, and value.
 * Follows the design system typography patterns:
 * - Icon: 14px, text-muted-foreground
 * - Label: text-muted-foreground
 * - Value: text-foreground font-medium, optional mono font for numbers
 */
export const MetadataItem: React.FC<MetadataItemProps> = memo(function MetadataItem({
  icon: Icon,
  label,
  value,
  mono = false,
  className,
}) {
  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <Icon size={14} className="text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span
        className={cn(
          'font-medium text-foreground',
          mono && 'font-mono tabular-nums'
        )}
      >
        {value}
      </span>
    </div>
  );
});

MetadataItem.displayName = 'MetadataItem';
