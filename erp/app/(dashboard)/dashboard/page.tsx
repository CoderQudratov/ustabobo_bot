'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import type { DashboardRes } from '@/lib/dashboard';
import { formatSom } from '@/lib/dashboard';
import {
  useWeeklyOrders,
  useWeeklyRevenue,
  useOrderStatusPie,
} from '@/hooks/useDashboardCharts';

function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiGet<DashboardRes>('/admin/dashboard'),
  });
}

const CHART_COLORS = {
  bar: 'hsl(var(--primary))',
  line: 'hsl(var(--chart-2))',
  pie: ['#3b82f6', '#22c55e', '#eab308', '#ef4444'],
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Kutilmoqda',
  in_progress: 'Jarayonda',
  completed: 'Tugallandi',
  cancelled: 'Bekor qilindi',
};

function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Skeleton
      className={className}
      style={{ minHeight: 280 }}
    />
  );
}

function ChartError({ message }: { message: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
      {message}
    </div>
  );
}

export default function DashboardPage() {
  const { data: dashboard, isLoading: dashLoading } = useDashboard();
  const weeklyOrders = useWeeklyOrders();
  const weeklyRevenue = useWeeklyRevenue();
  const orderStatusPie = useOrderStatusPie();

  const loading = dashLoading;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* 4 karta */}
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
              <span className="text-2xl font-bold">
                {dashboard?.today_orders ?? 0}
              </span>
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
                {dashboard != null
                  ? formatSom(dashboard.today_revenue)
                  : '—'}
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
              <span className="text-2xl font-bold">
                {dashboard?.active_orders ?? 0}
              </span>
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

      {/* Diagrammalar */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* BarChart — 7 kunlik buyurtmalar */}
        <Card>
          <CardHeader>
            <CardTitle>Oxirgi 7 kun — buyurtmalar</CardTitle>
          </CardHeader>
          <CardContent className="w-full">
            {weeklyOrders.isLoading && (
              <ChartSkeleton className="h-[280px] w-full" />
            )}
            {weeklyOrders.isError && (
              <ChartError
                message={
                  weeklyOrders.error instanceof Error
                    ? weeklyOrders.error.message
                    : 'Ma’lumot yuklanmadi'
                }
              />
            )}
            {weeklyOrders.isSuccess && weeklyOrders.data?.items?.length > 0 && (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weeklyOrders.data.items}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getDate()}.${d.getMonth() + 1}`;
                      }}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip
                      labelFormatter={(v) => new Date(v).toLocaleDateString('uz-UZ')}
                      formatter={(value) => [value ?? 0, 'Buyurtmalar']}
                    />
                    <Bar
                      dataKey="count"
                      fill={CHART_COLORS.bar}
                      radius={[4, 4, 0, 0]}
                      name="Buyurtmalar"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {weeklyOrders.isSuccess &&
              (!weeklyOrders.data?.items?.length ||
                weeklyOrders.data.items.length === 0) && (
                <div className="flex min-h-[280px] items-center justify-center text-muted-foreground">
                  Ma’lumot yo‘q
                </div>
              )}
          </CardContent>
        </Card>

        {/* LineChart — 7 kunlik tushum */}
        <Card>
          <CardHeader>
            <CardTitle>Oxirgi 7 kun — tushum (so‘m)</CardTitle>
          </CardHeader>
          <CardContent className="w-full">
            {weeklyRevenue.isLoading && (
              <ChartSkeleton className="h-[280px] w-full" />
            )}
            {weeklyRevenue.isError && (
              <ChartError
                message={
                  weeklyRevenue.error instanceof Error
                    ? weeklyRevenue.error.message
                    : 'Ma’lumot yuklanmadi'
                }
              />
            )}
            {weeklyRevenue.isSuccess &&
              weeklyRevenue.data?.items?.length > 0 && (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={weeklyRevenue.data.items}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="opacity-50"
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v) => {
                          const d = new Date(v);
                          return `${d.getDate()}.${d.getMonth() + 1}`;
                        }}
                        fontSize={12}
                      />
                      <YAxis
                        fontSize={12}
                        tickFormatter={(v) =>
                          v >= 1_000_000
                            ? `${v / 1_000_000} mln`
                            : v >= 1_000
                              ? `${v / 1_000}k`
                              : v
                        }
                      />
                      <Tooltip
                        labelFormatter={(v) =>
                          new Date(v).toLocaleDateString('uz-UZ')
                        }
                        formatter={(value) => [formatSom(Number(value ?? 0)), 'Tushum']}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke={CHART_COLORS.line}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Tushum"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            {weeklyRevenue.isSuccess &&
              (!weeklyRevenue.data?.items?.length ||
                weeklyRevenue.data.items.length === 0) && (
                <div className="flex min-h-[280px] items-center justify-center text-muted-foreground">
                  Ma’lumot yo‘q
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      {/* PieChart — buyurtma holatlari */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Buyurtma holatlari taqsimoti</CardTitle>
        </CardHeader>
        <CardContent className="w-full">
          {orderStatusPie.isLoading && (
            <ChartSkeleton className="h-[280px] w-full" />
          )}
          {orderStatusPie.isError && (
            <ChartError
              message={
                orderStatusPie.error instanceof Error
                  ? orderStatusPie.error.message
                  : 'Ma’lumot yuklanmadi'
              }
            />
          )}
          {orderStatusPie.isSuccess &&
            orderStatusPie.data?.items?.length > 0 && (
              <div className="mx-auto h-[280px] w-full max-w-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orderStatusPie.data.items.map((item, i) => ({
                        ...item,
                        name:
                          STATUS_LABELS[item.status] ?? item.status,
                        fill: CHART_COLORS.pie[i % CHART_COLORS.pie.length],
                      }))}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    />
                    <Tooltip
                      formatter={(value) => [value ?? 0, 'Buyurtmalar']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          {orderStatusPie.isSuccess &&
            (!orderStatusPie.data?.items?.length ||
              orderStatusPie.data.items.length === 0) && (
              <div className="flex min-h-[280px] items-center justify-center text-muted-foreground">
                Ma’lumot yo‘q
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
