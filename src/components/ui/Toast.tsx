import { Toaster, toast } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        style: {
          // Using --popover for floating UI elements (semantically appropriate)
          background: 'var(--popover)',
          border: '1px solid var(--border)',
          color: 'var(--popover-foreground)',
        },
        classNames: {
          // Using semantic theme variables for consistency
          success: 'border-success',
          error: 'border-destructive',
          warning: 'border-warning',
          info: 'border-info',
        },
      }}
      closeButton
      richColors
    />
  );
}

export { toast };
