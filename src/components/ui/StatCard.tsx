import React, { memo } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/primitives';
import { cn } from '@/lib/utils';

type StatVariant = 'default' | 'success' | 'info' | 'warning';

interface StatCardProps {
  title: string;
  /** The stat value - accepts any renderable content for flexibility */
  value: React.ReactNode;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: StatVariant;
  className?: string;
}

// Note: warning/info colors are hardcoded as the theme doesn't include
// dedicated CSS variables for these semantic colors. These match the
// Badge component variants for consistency.
const variantConfig: Record<
  StatVariant,
  { iconBg: string; iconColor: string; valueColor: string }
> = {
  default: {
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    valueColor: 'text-foreground',
  },
  success: {
    iconBg: 'bg-green-950/30',
    iconColor: 'text-green-500',
    valueColor: 'text-green-500',
  },
  info: {
    iconBg: 'bg-blue-950/30',
    iconColor: 'text-blue-500',
    valueColor: 'text-blue-500',
  },
  warning: {
    iconBg: 'bg-amber-950/30',
    iconColor: 'text-amber-500',
    valueColor: 'text-amber-500',
  },
};

export const StatCard: React.FC<StatCardProps> = memo(function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  className,
}) {
  const config = variantConfig[variant];

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
