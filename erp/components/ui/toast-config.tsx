'use client';

import { Toaster } from 'sonner';

/**
 * Global Toaster — premium dark theme.
 */
export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          fontSize: '14px',
        },
        classNames: {
          success: 'border-success/30',
          error: 'border-danger/30',
          loading: 'border-primary/30',
        },
      }}
    />
  );
}
