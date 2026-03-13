'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { startOfMonth, endOfDay, format, startOfDay, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { createWorkbook, addSheet, downloadWorkbook } from '@/lib/excel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatSom } from '@/lib/dashboard';
import { toast } from 'sonner';

const CHART_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

type ReportsRes = {
  period: { from: string; to: string };
  daily_revenue?: { date: string; revenue: number }[];
  summary: {
    total_orders: number;
    total_revenue: number;
    total_master_fees: number;
    total_driver_fees: number;
    boss_profit: number;
  };
  master_breakdown: {
    master_id: string;
    fullname: string;
    orders_count: number;
    total_revenue: number;
    master_fee: number;
  }[];
  organization_debts: { id: string; name: string; balance_due: number }[];
  top_services: { name: string; count: number; revenue: number }[];
};

const defaultFrom = format(startOfMonth(new Date()), 'yyyy-MM-dd');
const defaultTo = format(endOfDay(new Date()), 'yyyy-MM-dd');

type OrdersReportRes = {
  period: { from: string; to: string };
  orders: {
    created_at: string;
    completed_at: string | null;
    master_fullname: string;
    vehicle_plate: string;
    vehicle_model: string;
    owner_name: string;
    client_phone: string;
    total_amount: number;
    status: string;
    items: { name: string; type: string; quantity: number; price: number }[];
  }[];
};

export default function ReportsPage() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [queryFrom, setQueryFrom] = useState(defaultFrom);
  const [queryTo, setQueryTo] = useState(defaultTo);

  const params = new URLSearchParams({
    from: new Date(queryFrom + 'T00:00:00').toISOString(),
    to: new Date(queryTo + 'T23:59:59').toISOString(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['reports', queryFrom, queryTo],
    queryFn: () => apiGet<ReportsRes>(`/admin/reports?${params}`),
  });

  const handleFetch = () => {
    setQueryFrom(from);
    setQueryTo(to);
  };

  const setPeriod = (preset: 'bugun' | 'hafta' | 'oy' | 'yil') => {
    const now = new Date();
    let fromDate: Date;
    let toDate: Date;
    if (preset === 'bugun') {
      fromDate = startOfDay(now);
      toDate = endOfDay(now);
    } else if (preset === 'hafta') {
      fromDate = startOfWeek(now, { weekStartsOn: 1 });
      toDate = endOfWeek(now, { weekStartsOn: 1 });
    } else if (preset === 'oy') {
      fromDate = startOfMonth(now);
      toDate = endOfDay(now);
    } else {
      fromDate = startOfYear(now);
      toDate = endOfYear(now);
    }
    setFrom(format(fromDate, 'yyyy-MM-dd'));
    setTo(format(toDate, 'yyyy-MM-dd'));
    setQueryFrom(format(fromDate, 'yyyy-MM-dd'));
    setQueryTo(format(toDate, 'yyyy-MM-dd'));
  };

  const handleExportOrdersExcel = async () => {
    try {
      const ordersData = await apiGet<OrdersReportRes>(
        `/admin/reports/orders?from=${encodeURIComponent(queryFrom)}&to=${encodeURIComponent(queryTo)}`
      );
      const wb = createWorkbook();
      const headers = [
        'Sana',
        'Usta',
        'Mashina raqami',
        'Mashina modeli',
        'Egasi (mijoz/tashkilot)',
        'Telefon',
        'Xizmatlar va mahsulotlar',
        'Jami (so\'m)',
        'Holat',
      ];
      const rows = (ordersData?.orders ?? []).map((o) => {
        const itemsText =
          o.items
            .map((i) => `${i.name} (${i.type}) ${i.quantity} × ${i.price.toLocaleString('uz-UZ')}`)
            .join('; ') || '—';
        return [
          format(new Date(o.created_at), 'dd.MM.yyyy HH:mm'),
          o.master_fullname,
          o.vehicle_plate,
          o.vehicle_model,
          o.owner_name,
          o.client_phone,
          itemsText,
          o.total_amount,
          o.status === 'completed' ? 'Tugallangan' : o.status === 'cancelled' ? 'Bekor' : 'Jarayonda',
        ];
      });
      addSheet(wb, 'Buyurtmalar', {
        title: `Buyurtmalar hisoboti: ${queryFrom} — ${queryTo}`,
        headers,
        rows,
        colWidths: [18, 18, 14, 16, 22, 14, 45, 14, 12],
      });
      downloadWorkbook(wb, `Buyurtmalar_${queryFrom}_${queryTo}.xlsx`);
      toast.success('Excel fayl yuklandi');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    }
  };

  const handleExportExcel = () => {
    if (!data) return;
    const wb = createWorkbook();

    addSheet(wb, 'Ustalar', {
      headers: ['Usta', 'Buyurtmalar', 'Tushum (so\'m)', 'Haq (so\'m)'],
      rows: data.master_breakdown.map((m) => [
        m.fullname,
        m.orders_count,
        m.total_revenue,
        m.master_fee,
      ]),
    });
    addSheet(wb, 'Qarzdorlar', {
      headers: ['Tashkilot', 'Qarz (so\'m)'],
      rows: data.organization_debts.map((o) => [o.name, o.balance_due]),
    });
    addSheet(wb, 'Xizmatlar', {
      headers: ['Xizmat', 'Soni', 'Tushum (so\'m)'],
      rows: data.top_services.map((s) => [s.name, s.count, s.revenue]),
    });
    addSheet(wb, 'Umumiy', {
      title: `Hisobot: ${queryFrom} — ${queryTo}`,
      headers: ['Ko‘rsatkich', 'Qiymat'],
      rows: [
        ['Jami buyurtmalar', data.summary.total_orders],
        ['Jami tushum (so\'m)', data.summary.total_revenue],
        ['Boss foyda (so\'m)', data.summary.boss_profit],
      ],
    });

    downloadWorkbook(wb, `hisobot_${queryFrom}_${queryTo}.xlsx`);
  };

  const dailyData =
    data?.daily_revenue?.map((d) => ({
      ...d,
      label: format(new Date(d.date), 'dd.MM'),
    })) ?? [];

  const masterChartData = data?.master_breakdown?.map((m) => ({
    name: m.fullname,
    value: m.total_revenue,
  })) ?? [];

  const servicePieData =
    data?.top_services?.map((s) => ({
      name: s.name,
      value: s.count,
    })) ?? [];

  const orgChartData = data?.organization_debts?.map((o) => ({
    name: o.name.length > 20 ? o.name.slice(0, 20) + '…' : o.name,
    fullName: o.name,
    value: o.balance_due,
  })) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hisobotlar</h1>

      {/* Sana + Hisobot olish + Export */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Dan</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <Label>Gacha</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPeriod('bugun')}>Bugun</Button>
              <Button variant="outline" size="sm" onClick={() => setPeriod('hafta')}>Hafta</Button>
              <Button variant="outline" size="sm" onClick={() => setPeriod('oy')}>Oy</Button>
              <Button variant="outline" size="sm" onClick={() => setPeriod('yil')}>Yil</Button>
            </div>
            <Button onClick={handleFetch}>Hisobot olish</Button>
            {data && (
              <Button variant="outline" onClick={handleExportExcel}>
                Excel ga eksport
              </Button>
            )}
          </div>
          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-sm text-[var(--text-3)] mb-2">
              Buyurtmalar hisoboti — usta, mashina, egasi (mijoz/tashkilot), summa, xizmatlar bo‘yicha
            </p>
            <Button variant="outline" onClick={handleExportOrdersExcel}>
              Buyurtmalar hisoboti (Excel)
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : data ? (
        <>
          {/* 2x2 Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* 1. BarChart — Ustalar bo'yicha tushum */}
            <Card>
              <CardHeader>
                <CardTitle>Ustalar bo‘yicha tushum</CardTitle>
              </CardHeader>
              <CardContent>
                {masterChartData.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">
                    Ma’lumot yo‘q
                  </p>
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={masterChartData}
                        layout="vertical"
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                        <XAxis
                          type="number"
                          tickFormatter={(v) =>
                            v >= 1_000_000 ? `${v / 1_000_000} mln` : `${v / 1_000}k`
                          }
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={100}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(v) => [formatSom(Number(v ?? 0)), 'Tushum']}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {masterChartData.map((_, i) => (
                            <Cell
                              key={i}
                              fill={CHART_COLORS[i % CHART_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. AreaChart — Kunlik tushum trendi */}
            <Card>
              <CardHeader>
                <CardTitle>Kunlik tushum trendi</CardTitle>
              </CardHeader>
              <CardContent>
                {dailyData.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">
                    Ma’lumot yo‘q
                  </p>
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={dailyData}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          tickFormatter={(v) =>
                            v >= 1_000_000 ? `${v / 1_000_000} mln` : `${v / 1_000}k`
                          }
                        />
                        <Tooltip
                          formatter={(v) => [formatSom(Number(v ?? 0)), 'Tushum']}
                          labelFormatter={(_, payload) =>
                            payload?.[0]?.payload?.date
                              ? format(new Date(payload[0].payload.date), 'dd.MM.yyyy')
                              : ''
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--chart-2))"
                          fill="hsl(var(--chart-2))"
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. PieChart — Xizmat turlari taqsimoti */}
            <Card>
              <CardHeader>
                <CardTitle>Xizmat turlari taqsimoti</CardTitle>
              </CardHeader>
              <CardContent>
                {servicePieData.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">
                    Ma’lumot yo‘q
                  </p>
                ) : (
                  <div className="mx-auto h-[280px] w-full max-w-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={servicePieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius="80%"
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                        >
                          {servicePieData.map((_, i) => (
                            <Cell
                              key={i}
                              fill={CHART_COLORS[i % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v, _: unknown, props) => [
                            `${v ?? 0} marta`,
                            (props as { payload?: { name: string } })?.payload?.name ?? '',
                          ]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 4. BarChart — Tashkilotlar qarz (qizil) */}
            <Card>
              <CardHeader>
                <CardTitle>Tashkilotlar bo‘yicha qarz holati</CardTitle>
              </CardHeader>
              <CardContent>
                {orgChartData.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">
                    Qarzdor tashkilotlar yo‘q
                  </p>
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={orgChartData}
                        layout="vertical"
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                        <XAxis
                          type="number"
                          tickFormatter={(v) =>
                            v >= 1_000_000 ? `${v / 1_000_000} mln` : `${v / 1_000}k`
                          }
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={100}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(v) => [formatSom(Number(v ?? 0)), 'Qarz']}
                          content={({ payload }) =>
                            payload?.[0] ? (
                              <div className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm shadow">
                                {payload[0].payload.fullName}: {formatSom(payload[0].value as number)}
                              </div>
                            ) : null
                          }
                        />
                        <Bar
                          dataKey="value"
                          fill="#ef4444"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Mavjud jadvallar */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Jami tushum</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">
                  {data.summary.total_revenue.toLocaleString('uz-UZ')} so‘m
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Boss foyda</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">
                  {data.summary.boss_profit.toLocaleString('uz-UZ')} so‘m
                </span>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usta bo‘yicha</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="p-2 text-left">Usta</th>
                    <th className="p-2 text-right">Tushum</th>
                    <th className="p-2 text-right">Haq</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.master_breakdown ?? []).map((m) => (
                    <tr key={m.master_id} className="border-b border-[var(--border)]">
                      <td className="p-2">{m.fullname}</td>
                      <td className="p-2 text-right">
                        {m.total_revenue.toLocaleString('uz-UZ')}
                      </td>
                      <td className="p-2 text-right">
                        {m.master_fee.toLocaleString('uz-UZ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tashkilot qarzlari</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="p-2 text-left">Tashkilot</th>
                    <th className="p-2 text-right">Qarz</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.organization_debts ?? []).map((o) => (
                    <tr key={o.id} className="border-b border-[var(--border)]">
                      <td className="p-2">{o.name}</td>
                      <td className="p-2 text-right">
                        {o.balance_due.toLocaleString('uz-UZ')} so‘m
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top xizmatlar</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {(data.top_services ?? []).map((s, i) => (
                  <li key={i}>
                    {s.name} — {s.count} marta
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-muted-foreground">
          Ma’lumot yo‘q. Sana oralig‘ini o‘zgartirib &quot;Hisobot olish&quot; ni bosing.
        </p>
      )}
    </div>
  );
}
