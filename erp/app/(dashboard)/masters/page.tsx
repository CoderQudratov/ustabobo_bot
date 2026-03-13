'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { UsersListRes } from '@/lib/types';
import { formatSom } from '@/lib/dashboard';
import { format, startOfMonth, endOfDay, startOfDay, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';

const DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function MastersPage() {
  const [page] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput.trim().toLowerCase(), DEBOUNCE_MS);

  const defaultFrom = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const defaultTo = format(endOfDay(new Date()), 'yyyy-MM-dd');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', '20');

  const { data, isLoading } = useQuery({
    queryKey: ['masters', page],
    queryFn: () => apiGet<UsersListRes>(`/admin/masters?${params}`),
  });

  type MastersKpiRes = {
    master_breakdown: {
      master_id: string;
      fullname: string;
      orders_count: number;
      total_revenue: number;
      master_fee: number;
    }[];
  };

  const reportParams = useMemo(() => {
    const fromIso = new Date(from + 'T00:00:00').toISOString();
    const toIso = new Date(to + 'T23:59:59').toISOString();
    return `from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
  }, [from, to]);

  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['masters-kpi', from, to],
    queryFn: () => apiGet<MastersKpiRes>(`/admin/reports?${reportParams}`),
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const filteredItems = useMemo(() => {
    if (!debouncedSearch) return items;
    return items.filter(
      (u) =>
        u.fullname.toLowerCase().includes(debouncedSearch) ||
        (u.phone && u.phone.toLowerCase().includes(debouncedSearch))
    );
  }, [items, debouncedSearch]);

  const total = data?.total ?? 0;

  const masterKpiMap = useMemo(() => {
    const map = new Map<
      string,
      {
        orders_count: number;
        total_revenue: number;
        master_fee: number;
      }
    >();
    kpiData?.master_breakdown?.forEach((m) => {
      map.set(m.master_id, {
        orders_count: m.orders_count,
        total_revenue: m.total_revenue,
        master_fee: m.master_fee,
      });
    });
    return map;
  }, [kpiData?.master_breakdown]);

  const shortcuts = (() => {
    const today = new Date();
    return {
      bugun: [
        format(startOfDay(today), 'yyyy-MM-dd'),
        format(endOfDay(today), 'yyyy-MM-dd'),
      ] as const,
      hafta: [
        format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      ] as const,
      oy: [
        format(startOfMonth(today), 'yyyy-MM-dd'),
        format(endOfDay(today), 'yyyy-MM-dd'),
      ] as const,
      yil: [
        format(startOfYear(today), 'yyyy-MM-dd'),
        format(endOfYear(today), 'yyyy-MM-dd'),
      ] as const,
    };
  })();

  return (
    <div className="space-y-5">
      <div className="mb-5 border-b border-[var(--border)] pb-5">
        <h1 className="text-xl font-bold text-[var(--text-1)]">Ustalar</h1>
        <p className="mt-0.5 text-[13px] text-[var(--text-3)]">
          Jami {total} ta usta
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <Input
              placeholder="Ism yoki telefon bo‘yicha qidirish..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="max-w-xs"
            />
            <div className="space-y-1">
              <p className="text-[11px] text-[var(--text-3)]">Davr (usta KPIs)</p>
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-40"
                />
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-40"
                />
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setFrom(shortcuts.bugun[0]);
                      setTo(shortcuts.bugun[1]);
                    }}
                  >
                    Bugun
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setFrom(shortcuts.oy[0]);
                      setTo(shortcuts.oy[1]);
                    }}
                  >
                    Oy
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setFrom(shortcuts.yil[0]);
                      setTo(shortcuts.yil[1]);
                    }}
                  >
                    Yil
                  </Button>
                </div>
              </div>
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : filteredItems.length === 0 ? (
            <p className="py-8 text-center text-[var(--text-3)]">
              {searchInput.trim() ? 'Qidiruv bo‘yicha usta topilmadi' : 'Ustalar ro‘yxati bo‘sh'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-2)]">
                    <th className="p-3 text-left font-medium">Usta</th>
                    <th className="p-3 text-left font-medium">Telefon</th>
                    <th className="p-3 text-left font-medium">Foiz</th>
                    <th className="p-3 text-left font-medium">Holat</th>
                    <th className="p-3 text-right font-medium">Buyurtmalar</th>
                    <th className="p-3 text-right font-medium">Tushum (davr)</th>
                    <th className="p-3 text-right font-medium">Usta haqi</th>
                    <th className="p-3 text-right font-medium">O‘rtacha chek</th>
                    <th className="p-3 text-right font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((u) => (
                    <tr key={u.id} className="border-b border-[var(--border)]">
                      <td className="p-3 font-medium">{u.fullname}</td>
                      <td className="p-3">
                        <a href={`tel:${u.phone}`} className="hover:underline">
                          {u.phone}
                        </a>
                      </td>
                      <td className="p-3">{u.percent_rate ? `${u.percent_rate}%` : '—'}</td>
                      <td className="p-3">
                        <Badge variant={u.is_active ? 'default' : 'secondary'}>
                          {u.is_active ? 'Aktiv' : 'Nofaol'}
                        </Badge>
                      </td>
                      {(() => {
                        const kpi = masterKpiMap.get(u.id);
                        const ordersCount = kpi?.orders_count ?? 0;
                        const revenue = kpi?.total_revenue ?? 0;
                        const masterFee = kpi?.master_fee ?? 0;
                        const avgCheck = ordersCount ? Math.round(revenue / ordersCount) : 0;
                        return (
                          <>
                            <td className="p-3 text-right">
                              {kpiLoading ? '…' : ordersCount}
                            </td>
                            <td className="p-3 text-right">
                              {kpiLoading ? '…' : formatSom(revenue)}
                            </td>
                            <td className="p-3 text-right">
                              {kpiLoading ? '…' : formatSom(masterFee)}
                            </td>
                            <td className="p-3 text-right">
                              {kpiLoading ? '…' : avgCheck ? formatSom(avgCheck) : '—'}
                            </td>
                          </>
                        );
                      })()}
                      <td className="p-3 text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/masters/${u.id}`}>
                            Hisobot
                          </Link>
                        </Button>
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
