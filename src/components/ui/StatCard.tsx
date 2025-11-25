import React, { memo } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/primitives';
import { cn } from '@/lib/utils';

type StatVariant = 'default' | 'success' | 'info' | 'warning';

interface StatCardProps {
  title: string;
  /**
   * The stat value - constrained to string or number for predictable layout.
   * Complex ReactNode content (e.g., nested elements) could cause font-size
   * and line-height issues with the text-2xl styling applied to the value.
   */
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: StatVariant;
  className?: string;
}

// Using semantic theme CSS variables for consistent styling
const VARIANT_CONFIG = {
  default: {
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    valueColor: 'text-foreground',
  },
  success: {
    iconBg: 'bg-success/20',
    iconColor: 'text-success',
    valueColor: 'text-success',
  },
  info: {
    iconBg: 'bg-info/20',
    iconColor: 'text-info',
    valueColor: 'text-info',
  },
  warning: {
    iconBg: 'bg-warning/20',
    iconColor: 'text-warning',
    valueColor: 'text-warning',
  },
} as const satisfies Record<StatVariant, { iconBg: string; iconColor: string; valueColor: string }>;

export const StatCard: React.FC<StatCardProps> = memo(function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  className,
}) {
  const config = VARIANT_CONFIG[variant];

  return (
    <Card className={className}>
      <CardContent className="flex items-center gap-4 p-4">
        {Icon && (
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
              config.iconBg
            )}
            aria-hidden="true"
          >
            <Icon className={cn('h-6 w-6', config.iconColor)} />
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">{title}</span>
          <span className={cn('text-2xl font-bold', config.valueColor)}>
            {value}
          </span>
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

StatCard.displayName = 'StatCard';
