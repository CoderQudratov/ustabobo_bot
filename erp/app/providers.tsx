'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { queryClient } from '@/lib/query-client';
import { ToastProvider } from '@/components/ui/toast-config';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <QueryClientProvider client={queryClient}>
          {children}
          <ToastProvider />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
