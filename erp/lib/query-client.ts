'use client';

import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from './errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
    mutations: {
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    },
  },
});

queryClient.getQueryCache().config.onError = (error) => {
  toast.error(getErrorMessage(error));
};
