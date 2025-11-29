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
          // Using semantic theme variables for consistency with design system
          success: 'border-l-4 border-l-success',
          error: 'bg-destructive border-destructive text-destructive-foreground',
          warning: 'border-l-4 border-l-warning',
          info: 'border-l-4 border-l-info',
        },
      }}
      closeButton
    />
  );
}

export { toast };
