'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type {
  WeeklyOrdersRes,
  WeeklyRevenueRes,
  OrderStatusCountsRes,
} from '@/lib/dashboard';

export function useWeeklyOrders() {
  return useQuery({
    queryKey: ['dashboard', 'weekly-orders'],
    queryFn: () => apiGet<WeeklyOrdersRes>('/admin/dashboard/weekly-orders'),
  });
}

export function useWeeklyRevenue() {
  return useQuery({
    queryKey: ['dashboard', 'weekly-revenue'],
    queryFn: () => apiGet<WeeklyRevenueRes>('/admin/dashboard/weekly-revenue'),
  });
}

export function useOrderStatusPie() {
  return useQuery({
    queryKey: ['dashboard', 'order-status-counts'],
    queryFn: () =>
      apiGet<OrderStatusCountsRes>('/admin/dashboard/order-status-counts'),
  });
}
