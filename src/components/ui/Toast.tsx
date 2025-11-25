import { Toaster, toast } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        style: {
          background: '#18181b', // zinc-900
          border: '1px solid #27272a', // zinc-800
          color: '#fafafa', // zinc-50
        },
        classNames: {
          success: 'border-green-800',
          error: 'border-red-800',
          warning: 'border-amber-800',
          info: 'border-blue-800',
        },
      }}
      closeButton
      richColors
    />
  );
}

export { toast };
