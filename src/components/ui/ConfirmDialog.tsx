import React from 'react';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/primitives';
import { cn } from '@/lib/utils';

type DialogVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: DialogVariant;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-destructive/20',
    iconColor: 'text-destructive',
    actionClass: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-900/30',
    iconColor: 'text-amber-500',
    actionClass: 'bg-amber-600 text-white hover:bg-amber-700',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-900/30',
    iconColor: 'text-blue-500',
    actionClass: 'bg-blue-600 text-white hover:bg-blue-700',
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'info',
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
                config.iconBg
              )}
            >
              <Icon className={cn('h-6 w-6', config.iconColor)} />
            </div>
            <div className="flex flex-col gap-2">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription>{message}</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={config.actionClass}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
