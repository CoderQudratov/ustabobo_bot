'use client';

import { Toaster } from 'sonner';

/**
 * Global Toaster — layout.tsx yoki providers da ishlatiladi.
 * Muvaffaqiyat: yashil, Xato: qizil, Loading: spinner.
 */
export function ToastProvider() {
  return (
    <Toaster
      richColors
      position="top-center"
      toastOptions={{
        classNames: {
          success: 'border-green-500/50',
          error: 'border-red-500/50',
          loading: 'border-primary/50',
        },
      }}
    />
  );
}
