'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
} from 'recharts';
import type { DashboardRes } from '@/lib/dashboard';
import { formatSom } from '@/lib/dashboard';
import type { OrderStatus } from '@/lib/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  useWeeklyOrders,
  useWeeklyRevenue,
} from '@/hooks/useDashboardCharts';
import {
  DollarSign,
  ClipboardList,
  Zap,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Wallet,
  PiggyBank,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiGet<DashboardRes>('/admin/dashboard'),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

function useUmumiyTushum() {
  return useQuery({
    queryKey: ['dashboard', 'umumiy-tushum'],
    queryFn: () => apiGet<{ total: number }>('/admin/dashboard/umumiy-tushum'),
    staleTime: 30_000,
  });
}

function useSofFoyda() {
  return useQuery({
    queryKey: ['dashboard', 'sof-foyda'],
    queryFn: () =>
      apiGet<{
        sof_foyda: number;
        tushum: number;
        ish_haqi: number;
        zapchast_tannarx: number;
        yalpi_foyda: number;
      }>('/admin/dashboard/sof-foyda'),
    staleTime: 30_000,
  });
}

const CHART_COLORS = {
  bar: '#6366f1',
  line: '#10b981',
  lineGradient: ['#6366f1', '#6366f100'],
};

const STAT_CARDS = [
  {
    key: 'revenue',
    title: 'Bugungi daromad',
    icon: DollarSign,
    iconColor: 'text-warning',
    getValue: (d: DashboardRes | undefined) =>
      d != null ? formatSom(d.today_revenue) : '—',
    trend: null as number | null,
  },
  {
    key: 'orders',
    title: 'Bugungi buyurtmalar',
    icon: ClipboardList,
    iconColor: 'text-primary',
    getValue: (d: DashboardRes | undefined) => String(d?.today_orders ?? '—'),
    trend: null,
  },
  {
    key: 'active',
    title: 'Aktiv buyurtmalar',
    icon: Zap,
    iconColor: 'text-success',
    getValue: (d: DashboardRes | undefined) => String(d?.active_orders ?? '—'),
    trend: null,
  },
  {
    key: 'lowStock',
    title: 'Kam qolgan mahsulotlar',
    icon: AlertTriangle,
    iconColor: 'text-danger',
    getValue: (d: DashboardRes | undefined) =>
      String(d?.low_stock_count ?? '—'),
    trend: null,
  },
];

function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Skeleton
      className={cn('bg-surface-2 animate-shimmer', className)}
      style={{ minHeight: 280 }}
    />
  );
}

function ChartError({ message }: { message: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-danger/30 bg-danger/5 p-4 text-center text-sm text-danger">
      {message}
    </div>
  );
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: dashboard, isLoading: dashLoading } = useDashboard();
  const umumiyTushum = useUmumiyTushum();
  const sofFoyda = useSofFoyda();
  const weeklyOrders = useWeeklyOrders();
  const weeklyRevenue = useWeeklyRevenue();

  const loading = dashLoading;
  const recentOrders = dashboard?.recent_orders ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--text-3)]">
          🔄 1 daqiqada yangilanadi
        </p>
        <Button
          variant="outline"
          size="sm"
          className="text-[var(--text-2)] hover:bg-[var(--bg-3)]"
          onClick={() =>
            queryClient.refetchQueries({ queryKey: ['dashboard'] })
          }
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Yangilash
        </Button>
      </div>

      {/* 4 stat kartalar */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.key}
              className="animate-fade-in-up transition-all duration-200 hover:shadow-md"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-[var(--text-2)]">
                  {card.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-9 w-24 bg-surface-2 animate-shimmer" />
                ) : (
                  <>
                    <div className="font-mono text-3xl font-bold text-[var(--text-1)]">
                      {card.getValue(dashboard)}
                    </div>
                    {card.trend != null && (
                      <div
                        className={cn(
                          'mt-1 flex items-center gap-1 text-xs',
                          card.trend >= 0 ? 'text-success' : 'text-danger'
                        )}
                      >
                        <TrendingUp className="h-3 w-3" />
                        {card.trend >= 0 ? '+' : ''}
                        {card.trend}% o‘tgan kuniga nisbatan
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Umumiy tushum va foyda tahlili */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="animate-fade-in-up transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-2)]">
              Umumiy tushum
            </CardTitle>
            <Wallet className="h-5 w-5 text-[var(--accent)]" />
          </CardHeader>
          <CardContent>
            {umumiyTushum.isLoading ? (
              <Skeleton className="h-9 w-32 bg-surface-2 animate-shimmer" />
            ) : (
              <div className="font-mono text-3xl font-bold text-[var(--text-1)]">
                {formatSom(umumiyTushum.data?.total ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="animate-fade-in-up transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-2)]">
              Foyda tahlili (yalpi / sof)
            </CardTitle>
            <PiggyBank className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            {sofFoyda.isLoading ? (
              <Skeleton className="h-20 w-full bg-surface-2 animate-shimmer" />
            ) : (
              <>
                <div className="mb-2 flex flex-wrap gap-6">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-[var(--text-3)]">
                      Yalpi foyda
                    </p>
                    <p className="font-mono text-2xl font-semibold text-[var(--accent)]">
                      {formatSom(sofFoyda.data?.yalpi_foyda ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-[var(--text-3)]">
                      Sof foyda
                    </p>
                    <p className="font-mono text-2xl font-semibold text-success">
                      {formatSom(sofFoyda.data?.sof_foyda ?? 0)}
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 text-xs text-[var(--text-3)]">
                  <div className="flex items-center justify-between">
                    <span>Yalpi marja</span>
                    <span className="font-medium text-[var(--accent)]">
                      {sofFoyda.data?.tushum
                        ? `${Math.round(((sofFoyda.data?.yalpi_foyda ?? 0) / sofFoyda.data.tushum) * 100)}%`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Sof marja</span>
                    <span className="font-medium text-success">
                      {sofFoyda.data?.tushum
                        ? `${Math.round(((sofFoyda.data?.sof_foyda ?? 0) / sofFoyda.data.tushum) * 100)}%`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Zapchast tannarxi</span>
                    <span className="font-medium text-[var(--text-2)]">
                      {formatSom(sofFoyda.data?.zapchast_tannarx ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Usta va haydovchi ish haqi</span>
                    <span className="font-medium text-[var(--text-2)]">
                      {formatSom(sofFoyda.data?.ish_haqi ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tugallangan buyurtmalar tushumi</span>
                    <span className="font-medium text-[var(--text-2)]">
                      {formatSom(sofFoyda.data?.tushum ?? 0)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grafiklar */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-[var(--text-1)]">
              Oxirgi 7 kun — buyurtmalar
            </CardTitle>
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
                    : "Ma'lumot yuklanmadi"
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
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getDate()}.${d.getMonth() + 1}`;
                      }}
                    />
                    <YAxis
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                      }}
                      labelFormatter={(v) =>
                        new Date(v).toLocaleDateString('uz-UZ')
                      }
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
                <div className="flex min-h-[280px] items-center justify-center text-text-muted">
                  Ma&apos;lumot yo&apos;q
                </div>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[var(--text-1)]">
              Oxirgi 7 kun — tushum (so&apos;m)
            </CardTitle>
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
                    : "Ma'lumot yuklanmadi"
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
                      <defs>
                        <linearGradient
                          id="lineGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={CHART_COLORS.bar}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor={CHART_COLORS.bar}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        opacity={0.5}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                        tickFormatter={(v) => {
                          const d = new Date(v);
                          return `${d.getDate()}.${d.getMonth() + 1}`;
                        }}
                      />
                      <YAxis
                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                        tickFormatter={(v) =>
                          v >= 1_000_000
                            ? `${v / 1_000_000} mln`
                            : v >= 1_000
                              ? `${v / 1_000}k`
                              : v
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                        }}
                        labelFormatter={(v) =>
                          new Date(v).toLocaleDateString('uz-UZ')
                        }
                        formatter={(value) => [
                          formatSom(Number(value ?? 0)),
                          'Tushum',
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke={CHART_COLORS.line}
                        strokeWidth={2}
                        dot={{ r: 4, fill: 'var(--surface)' }}
                        name="Tushum"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            {weeklyRevenue.isSuccess &&
              (!weeklyRevenue.data?.items?.length ||
                weeklyRevenue.data.items.length === 0) && (
                <div className="flex min-h-[280px] items-center justify-center text-text-muted">
                  Ma&apos;lumot yo&apos;q
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Oxirgi buyurtmalar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[var(--text-1)]">
            Oxirgi buyurtmalar
          </CardTitle>
          <Button variant="outline" size="sm" className="text-[var(--text-2)] hover:bg-[var(--bg-3)]" asChild>
            <Link href="/orders">Barchasini ko&apos;rish →</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton
                  key={i}
                  className="h-12 w-full bg-surface-2 animate-shimmer"
                />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="erp-table-empty">
              <ClipboardList className="h-12 w-12 text-text-muted" />
              <p>Ma&apos;lumot topilmadi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="erp-table w-full text-sm">
                <thead>
                  <tr>
                    <th>Buyurtma №</th>
                    <th>Mijoz</th>
                    <th>Xizmat</th>
                    <th className="text-right">Summa</th>
                    <th>Holati</th>
                    <th>Vaqt</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="font-mono text-xs">
                        {o.id.slice(0, 8)}
                      </td>
                      <td>{o.client_name}</td>
                      <td>{o.service_name}</td>
                      <td className="cell-number">
                        {formatSom(o.total_amount)}
                      </td>
                      <td>
                        <StatusBadge status={o.status as OrderStatus} />
                      </td>
                      <td className="text-text-muted">
                        {new Date(o.created_at).toLocaleString('uz-UZ', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
