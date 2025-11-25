import { Toaster, toast } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        style: {
          background: 'var(--card)',
          border: '1px solid var(--border)',
          color: 'var(--card-foreground)',
        },
        classNames: {
          success: 'border-green-900',
          error: 'border-destructive',
          warning: 'border-amber-900',
          info: 'border-blue-900',
        },
      }}
      closeButton
      richColors
    />
  );
}

export { toast };
