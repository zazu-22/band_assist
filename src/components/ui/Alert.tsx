import React from 'react';
import { cn } from '@/lib/utils';

interface AlertProps {
  variant?: 'default' | 'destructive';
  className?: string;
  children: React.ReactNode;
}

export function Alert({ variant = 'default', className, children }: AlertProps) {
  return (
    <div
      className={cn(
        'relative w-full rounded-lg border p-4',
        variant === 'destructive'
          ? 'border-destructive/30 bg-destructive/5 text-destructive'
          : 'border-border bg-muted/50 text-foreground',
        className
      )}
    >
      {children}
    </div>
  );
}

interface AlertTitleProps {
  className?: string;
  children: React.ReactNode;
}

export function AlertTitle({ className, children }: AlertTitleProps) {
  return (
    <h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)}>
      {children}
    </h5>
  );
}

interface AlertDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export function AlertDescription({ className, children }: AlertDescriptionProps) {
  return (
    <div className={cn('text-sm [&_p]:leading-relaxed', className)}>
      {children}
    </div>
  );
}
