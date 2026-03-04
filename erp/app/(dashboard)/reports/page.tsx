'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

type ReportsRes = {
  total_revenue: number;
  total_boss_profit: number;
  per_master: { master_id: string; fullname: string; revenue: number; fee: number }[];
  organization_debts: { id: string; name: string; balance_due: number }[];
  top_services: { name: string; count: number }[];
};

export default function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const { data, isLoading } = useQuery({
    queryKey: ['reports', from, to],
    queryFn: () => apiGet<ReportsRes>(`/admin/reports?${params}`),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Hisobotlar</h1>
      <Card className="mb-6">
        <CardContent className="flex flex-wrap gap-4 pt-6">
          <div><Label>Dan</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
          <div><Label>Gacha</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
        </CardContent>
      </Card>
      {isLoading ? <Skeleton className="h-64 w-full" /> : data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Jami tushum</CardTitle></CardHeader><CardContent><span className="text-2xl font-bold">{data.total_revenue.toLocaleString('uz-UZ')} so‘m</span></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Boss foyda</CardTitle></CardHeader><CardContent><span className="text-2xl font-bold">{data.total_boss_profit.toLocaleString('uz-UZ')} so‘m</span></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Usta bo‘yicha</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="p-2 text-left">Usta</th><th className="p-2 text-right">Tushum</th><th className="p-2 text-right">Haq</th></tr></thead>
                <tbody>{(data.per_master ?? []).map((m) => <tr key={m.master_id} className="border-b"><td className="p-2">{m.fullname}</td><td className="p-2 text-right">{m.revenue.toLocaleString('uz-UZ')}</td><td className="p-2 text-right">{m.fee.toLocaleString('uz-UZ')}</td></tr>)}</tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Tashkilot qarzlari</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="p-2 text-left">Tashkilot</th><th className="p-2 text-right">Qarz</th></tr></thead>
                <tbody>{(data.organization_debts ?? []).map((o) => <tr key={o.id} className="border-b"><td className="p-2">{o.name}</td><td className="p-2 text-right">{o.balance_due.toLocaleString('uz-UZ')} so‘m</td></tr>)}</tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Top xizmatlar</CardTitle></CardHeader>
            <CardContent><ul className="space-y-1 text-sm">{(data.top_services ?? []).map((s, i) => <li key={i}>{s.name} — {s.count} marta</li>)}</ul></CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
