'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { format, startOfMonth, endOfDay } from 'date-fns';
import type { Client, ClientsListRes, ClientDetailRes } from '@/lib/clientHistory';

export interface ClientHistoryFilters {
  from: string;
  to: string;
  status: string;
  search: string;
  page: number;
}

export const defaultFrom = format(startOfMonth(new Date()), 'yyyy-MM-dd');
export const defaultTo = format(endOfDay(new Date()), 'yyyy-MM-dd');

export function useClientHistory(filters: ClientHistoryFilters) {
  const params = new URLSearchParams();
  params.set('from', filters.from);
  params.set('to', filters.to);
  params.set('page', String(filters.page));
  params.set('limit', '20');
  if (filters.status) params.set('status', filters.status);
  if (filters.search.trim()) params.set('search', filters.search.trim());

  return useQuery({
    queryKey: ['clients', 'individuals', filters],
    queryFn: () =>
      apiGet<ClientsListRes>(`/admin/clients/individuals?${params}`),
    enabled: !!filters.from && !!filters.to,
  });
}

export function useClientDetail(clientPhone: string | null) {
  return useQuery({
    queryKey: ['client', 'orders', clientPhone],
    queryFn: () =>
      apiGet<ClientDetailRes>(
        `/admin/clients/individuals/orders?phone=${encodeURIComponent(clientPhone!)}`
      ),
    enabled: !!clientPhone,
  });
}
