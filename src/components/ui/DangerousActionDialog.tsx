import React, { memo, useCallback, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  Input,
} from '@/components/primitives';
import { cn } from '@/lib/utils';

interface DangerousActionDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  /** The exact phrase user must type to confirm (case-sensitive) */
  confirmPhrase: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * Called when user confirms the action.
   * Should be wrapped in useCallback in parent component for stable reference.
   */
  onConfirm: () => void;
  /**
   * Called when dialog is dismissed (Cancel button, ESC key, or overlay click).
   * IMPORTANT: Must be wrapped in useCallback in parent component to prevent
   * unnecessary re-renders, as this is a dependency of internal handleOpenChange.
   */
  onCancel: () => void;
}

/**
 * DangerousActionDialog - Confirmation dialog requiring text input
 *
 * Used for high-risk operations like deleting all data.
 * User must type the exact confirmPhrase to enable the confirm button.
 */
export const DangerousActionDialog: React.FC<DangerousActionDialogProps> = memo(
  function DangerousActionDialog({
    isOpen,
    title,
    message,
    confirmPhrase,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
  }) {
    const [inputValue, setInputValue] = useState('');

    const isConfirmEnabled = inputValue.trim() === confirmPhrase;

    // Handle dialog open state changes (e.g., ESC key, overlay click)
    // Also resets input value when dialog closes
    const handleOpenChange = useCallback(
      (open: boolean) => {
        if (!open) {
          setInputValue('');
          onCancel();
        }
      },
      [onCancel]
    );

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    }, []);

    const handleConfirm = useCallback(() => {
      if (isConfirmEnabled) {
        onConfirm();
      }
    }, [isConfirmEnabled, onConfirm]);

    return (
      <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
                  'bg-destructive/20'
                )}
              >
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex flex-col gap-2">
                <AlertDialogTitle>{title}</AlertDialogTitle>
                <AlertDialogDescription>{message}</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              To confirm, type{' '}
              <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-destructive font-semibold">
                {confirmPhrase}
              </code>{' '}
              below:
            </p>
            <Input
              value={inputValue}
              onChange={handleInputChange}
              placeholder={confirmPhrase}
              className="font-mono"
              autoComplete="off"
              autoCorrect="off"
              autoFocus
              spellCheck={false}
            />
          </div>

          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={!isConfirmEnabled}
              className={cn(
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                !isConfirmEnabled && 'opacity-50'
              )}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

DangerousActionDialog.displayName = 'DangerousActionDialog';
