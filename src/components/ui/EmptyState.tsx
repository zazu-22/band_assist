import React, { memo } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent, Button } from '@/components/primitives';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = memo(function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <Card
      className={cn('border-dashed', className)}
      role="status"
      aria-live="polite"
    >
      <CardContent className="flex flex-col items-center justify-center py-12 px-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4"
          aria-hidden="true"
        >
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground text-center max-w-sm mb-6">
          {description}
        </p>
        {action && (
          <Button onClick={action.onClick}>{action.label}</Button>
        )}
      </CardContent>
    </Card>
  );
});
