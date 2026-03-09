'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { apiGet } from '@/lib/api';

export interface TenantStatus {
  is_blocked: boolean;
  is_active?: boolean;
  days_left: number | null;
  plan_expires?: string | null;
  tenant_name?: string;
}

export function useSubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tenant-status'],
    queryFn: () => apiGet<TenantStatus>('/admin/auth/tenant-status'),
    enabled: !!user && !user.is_super_admin,
    refetchInterval: 5 * 60 * 1000, // 5 daqiqada
    staleTime: 60 * 1000,
  });
}
