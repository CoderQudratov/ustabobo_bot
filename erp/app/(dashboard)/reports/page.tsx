'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { startOfMonth, endOfDay, format } from 'date-fns';
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
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatSom } from '@/lib/dashboard';

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

export default function ReportsPage() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [queryFrom, setQueryFrom] = useState(defaultFrom);
  const [queryTo, setQueryTo] = useState(defaultTo);

  const params = new URLSearchParams();
  params.set('from', queryFrom);
  params.set('to', queryTo);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', queryFrom, queryTo],
    queryFn: () => apiGet<ReportsRes>(`/admin/reports?${params}`),
  });

  const handleFetch = () => {
    setQueryFrom(from);
    setQueryTo(to);
  };

  const handleExportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    const masterData = [
      ['Usta', 'Buyurtmalar', 'Tushum (so\'m)', 'Haq (so\'m)'],
      ...data.master_breakdown.map((m) => [
        m.fullname,
        m.orders_count,
        m.total_revenue,
        m.master_fee,
      ]),
    ];
    const orgData = [
      ['Tashkilot', 'Qarz (so\'m)'],
      ...data.organization_debts.map((o) => [o.name, o.balance_due]),
    ];
    const serviceData = [
      ['Xizmat', 'Soni', 'Tushum (so\'m)'],
      ...data.top_services.map((s) => [s.name, s.count, s.revenue]),
    ];

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(masterData),
      'Ustalar'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(orgData),
      'Qarzdorlar'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(serviceData),
      'Xizmatlar'
    );

    const summaryData = [
      ['Hisobot', queryFrom, '—', queryTo],
      ['Jami buyurtmalar', data.summary.total_orders],
      ['Jami tushum (so\'m)', data.summary.total_revenue],
      ['Boss foyda (so\'m)', data.summary.boss_profit],
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(summaryData),
      'Umumiy'
    );

    XLSX.writeFile(
      wb,
      `hisobot_${queryFrom}_${queryTo}.xlsx`
    );
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
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
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
          <Button onClick={handleFetch}>Hisobot olish</Button>
          {data && (
            <Button variant="outline" onClick={handleExportExcel}>
              Excel ga eksport
            </Button>
          )}
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
                              <div className="rounded border bg-background px-3 py-2 text-sm shadow">
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
                  <tr className="border-b">
                    <th className="p-2 text-left">Usta</th>
                    <th className="p-2 text-right">Tushum</th>
                    <th className="p-2 text-right">Haq</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.master_breakdown ?? []).map((m) => (
                    <tr key={m.master_id} className="border-b">
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
                  <tr className="border-b">
                    <th className="p-2 text-left">Tashkilot</th>
                    <th className="p-2 text-right">Qarz</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.organization_debts ?? []).map((o) => (
                    <tr key={o.id} className="border-b">
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
          Sana oralig‘ini tanlang va &quot;Hisobot olish&quot; tugmasini bosing.
        </p>
      )}
    </div>
  );
}
