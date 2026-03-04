'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type DashboardRes = { low_stock_count: number };
type OrdersRes = { items: { total_amount: string; status: string }[]; total: number };

function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiGet<DashboardRes>('/admin/dashboard'),
  });
}

function useTodayOrders() {
  const today = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['orders', 'today', today],
    queryFn: () =>
      apiGet<OrdersRes>(`/admin/orders?from=${today}&to=${today}&limit=500`),
  });
}

function useActiveOrders() {
  return useQuery({
    queryKey: ['orders', 'active'],
    queryFn: () => apiGet<OrdersRes>('/admin/orders?limit=500'),
  });
}

export default function DashboardPage() {
  const { data: dashboard, isLoading: dashLoading } = useDashboard();
  const { data: todayOrders, isLoading: todayLoading } = useTodayOrders();
  const { data: activeOrders } = useActiveOrders();

  const todayCount = todayOrders?.total ?? 0;
  const todayRevenue = todayOrders?.items?.reduce(
    (sum, o) => sum + (o.status === 'completed' ? Number(o.total_amount) : 0),
    0
  ) ?? 0;
  const activeCount =
    activeOrders?.items?.filter(
      (o) => o.status !== 'completed' && o.status !== 'cancelled'
    ).length ?? 0;

  const loading = dashLoading || todayLoading;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bugungi buyurtmalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-2xl font-bold">{todayCount}</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bugungi tushum
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <span className="text-2xl font-bold">
                {todayRevenue.toLocaleString('uz-UZ')} so‘m
              </span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aktiv buyurtmalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-2xl font-bold">{activeCount}</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Kam qolgan zapchastlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-2xl font-bold">
                {dashboard?.low_stock_count ?? 0}
              </span>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
