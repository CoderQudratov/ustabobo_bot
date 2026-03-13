'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns';
import { createWorkbook, addSheet, downloadWorkbook } from '@/lib/excel';
import { formatSom } from '@/lib/dashboard';
import type { User } from '@/lib/types';

const defaultFrom = format(startOfMonth(new Date()), 'yyyy-MM-dd');
const defaultTo = format(endOfDay(new Date()), 'yyyy-MM-dd');

/** Usta hisoboti: /admin/masters/:id/report */
interface MasterReportRes {
  master: { id: string; fullname: string; phone: string };
  from: string;
  to: string;
  orders: {
    id: string;
    completed_at: string | null;
    client_name: string;
    client_phone: string;
    car_number: string;
    car_model: string;
    total_amount: number;
    items: { name: string; type: string; quantity: number; price: number }[];
  }[];
  summary: { orders_count: number; total_revenue: number; master_fee: number };
}

function dateRangeShortcuts() {
  const today = new Date();
  return {
    bugun: [format(startOfDay(today), 'yyyy-MM-dd'), format(endOfDay(today), 'yyyy-MM-dd')] as const,
    hafta: [format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'), format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')] as const,
    oy: [format(startOfMonth(today), 'yyyy-MM-dd'), format(endOfMonth(today), 'yyyy-MM-dd')] as const,
    yil: [format(startOfYear(today), 'yyyy-MM-dd'), format(endOfYear(today), 'yyyy-MM-dd')] as const,
  };
}

export default function MasterDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const reportParams = useMemo(() => {
    const fromIso = new Date(from + 'T00:00:00').toISOString();
    const toIso = new Date(to + 'T23:59:59').toISOString();
    return `from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
  }, [from, to]);

  const { data: master, isLoading: masterLoading, isError: masterError, error: masterErr } = useQuery({
    queryKey: ['user', id],
    queryFn: () => apiGet<User>(`/admin/users/${id}`),
    enabled: !!id,
  });

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['master-report', id, from, to],
    queryFn: () => apiGet<MasterReportRes>(`/admin/masters/${id}/report?${reportParams}`),
    enabled: !!id,
  });

  const shortcuts = dateRangeShortcuts();

  const handleExportExcel = async () => {
    if (!report) return;
    try {
      const wb = createWorkbook();
      const headers = ['Sana', 'Mijoz', 'Telefon', 'Mashina', 'Xizmatlar / mahsulotlar', 'Jami (so\'m)'];
      const rows = report.orders.map((o) => {
        const itemsText = o.items
          .map((i) => `${i.name} (${i.type}) ${i.quantity} x ${i.price}`)
          .join('; ') || '—';
        const dateStr = o.completed_at
          ? format(new Date(o.completed_at), 'dd.MM.yyyy HH:mm')
          : '—';
        return [
          dateStr,
          o.client_name,
          o.client_phone,
          o.car_number || o.car_model || '—',
          itemsText,
          o.total_amount,
        ];
      });
      addSheet(wb, 'Buyurtmalar', {
        title: `${report.master.fullname || 'Usta'} — ${from} … ${to}`,
        headers,
        rows,
        colWidths: [18, 20, 14, 14, 40, 14],
      });
      const safeName = (report.master.fullname || 'Usta').replace(/[/\\?*\[\]:]/g, '_').slice(0, 50);
      const ts = format(new Date(), 'yyyy-MM-dd_HH-mm');
      downloadWorkbook(wb, `Usta_${safeName}_${from}_${to}_${ts}.xlsx`);
      toast.success('Excel fayl yuklandi');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  if (!id) return null;
  if (masterError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
        {masterErr instanceof Error ? masterErr.message : 'Usta yuklanmadi'}
        <div className="mt-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/masters">← Orqaga</Link>
          </Button>
        </div>
      </div>
    );
  }
  if (masterLoading || !master) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const orders = report?.orders ?? [];
  const summary = report?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Button variant="ghost" size="sm" className="w-fit" asChild>
            <Link href="/masters">← Orqaga</Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {master.fullname}
          </h1>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/users?role=master`}>Xodimlar ro‘yxatida tahrirlash</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usta ma’lumotlari</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Ism: </span>
            <span className="font-medium">{master.fullname}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Telefon: </span>
            <a href={`tel:${master.phone}`} className="font-medium hover:underline">
              {master.phone}
            </a>
          </div>
          <div>
            <span className="text-muted-foreground">Ish haqi foizi: </span>
            <span>{master.percent_rate ? `${master.percent_rate}%` : '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Holat: </span>
            <span>{master.is_active ? 'Aktiv' : 'Nofaol'}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hisobot — tugallangan buyurtmalar</CardTitle>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-muted-foreground text-xs">Dan</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Gacha</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              <Button type="button" variant="outline" size="sm" onClick={() => { setFrom(shortcuts.bugun[0]); setTo(shortcuts.bugun[1]); }}>Bugun</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => { setFrom(shortcuts.hafta[0]); setTo(shortcuts.hafta[1]); }}>Hafta</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => { setFrom(shortcuts.oy[0]); setTo(shortcuts.oy[1]); }}>Oy</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => { setFrom(shortcuts.yil[0]); setTo(shortcuts.yil[1]); }}>Yil</Button>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!report}>
              Excel yuklab olish
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {summary && (
            <div className="mb-4 flex flex-wrap gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-2)] p-4">
              <div>
                <span className="text-muted-foreground text-sm">Buyurtmalar soni: </span>
                <span className="font-semibold">{summary.orders_count}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Jami tushum: </span>
                <span className="font-semibold">{formatSom(summary.total_revenue)}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Usta haqi: </span>
                <span className="font-semibold">{formatSom(summary.master_fee)}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">O‘rtacha chek: </span>
                <span className="font-semibold">
                  {summary.orders_count
                    ? formatSom(Math.round(summary.total_revenue / summary.orders_count))
                    : '—'}
                </span>
              </div>
            </div>
          )}
          {reportLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : orders.length === 0 ? (
            <p className="text-muted-foreground">Tanlangan davrda tugallangan buyurtma yo‘q</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-2)]">
                    <th className="p-3 text-left font-medium">Sana</th>
                    <th className="p-3 text-left font-medium">Mijoz</th>
                    <th className="p-3 text-left font-medium">Mashina</th>
                    <th className="p-3 text-left font-medium">Jami</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-[var(--border)]">
                      <td className="p-3">
                        {o.completed_at
                          ? format(new Date(o.completed_at), 'dd.MM.yyyy HH:mm')
                          : '—'}
                      </td>
                      <td className="p-3">{o.client_name}</td>
                      <td className="p-3">{o.car_number || o.car_model || '—'}</td>
                      <td className="p-3 font-medium">{formatSom(o.total_amount)}</td>
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
