import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        // Semantic status variants for band status (bold colors)
        success: 'border-success/30 bg-success/20 text-success',
        info: 'border-info/30 bg-info/20 text-info',
        warning: 'border-warning/30 bg-warning/20 text-warning',
        // Semantic status variants for user status (softer colors)
        'user-success': 'border-user-success/30 bg-user-success/20 text-user-success',
        'user-info': 'border-user-info/30 bg-user-info/20 text-user-info',
        'user-warning': 'border-user-warning/30 bg-user-warning/20 text-user-warning',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
