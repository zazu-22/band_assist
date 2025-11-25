import { useState, useCallback } from 'react';

type ConfirmDialogVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  variant: ConfirmDialogVariant;
  onConfirm: () => void;
}

interface ConfirmDialogOptions {
  title: string;
  message: string;
  variant?: ConfirmDialogVariant;
  onConfirm: () => void;
}

export const useConfirmDialog = (defaultVariant: ConfirmDialogVariant = 'danger') => {
  const [state, setState] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    variant: defaultVariant,
    onConfirm: () => {},
  });

  const open = useCallback((options: ConfirmDialogOptions) => {
    setState({
      isOpen: true,
      title: options.title,
      message: options.message,
      variant: options.variant || defaultVariant,
      onConfirm: options.onConfirm,
    });
  }, [defaultVariant]);

  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    isOpen: state.isOpen,
    title: state.title,
    message: state.message,
    variant: state.variant,
    onConfirm: state.onConfirm,
    open,
    close,
  };
};
