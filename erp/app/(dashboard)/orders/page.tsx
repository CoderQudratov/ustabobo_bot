'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import type { OrdersListRes, Order, OrderStatus } from '@/lib/types';
import { toast } from 'sonner';
import { OrderTable } from '@/components/orders/OrderTable';
import { OrderDetail } from '@/components/orders/OrderDetail';
import { NewOrderDialog } from '@/components/orders/NewOrderDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ChevronDown, Search, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createWorkbook, addSheet, downloadWorkbook } from '@/lib/excel';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Barchasi' },
  { value: 'pending', label: 'Kutilmoqda' },
  { value: 'working', label: 'Jarayonda' },
  { value: 'completed', label: 'Tugallangan' },
  { value: 'cancelled', label: 'Bekor' },
];

function Content() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [masterId, setMasterId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newOrderOpen, setNewOrderOpen] = useState(false);

  const orgId = searchParams.get('organization_id') ?? '';

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (status) params.set('status', status);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (masterId) params.set('master_id', masterId);
  if (orgId) params.set('organization_id', orgId);
  if (search.trim()) params.set('search', search.trim());

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, limit, status, from, to, masterId, orgId, search],
    queryFn: () => apiGet<OrdersListRes>(`/admin/orders?${params}`),
  });

  const { data: masters } = useQuery({
    queryKey: ['users', 'masters'],
    queryFn: () =>
      apiGet<{ items: { id: string; fullname: string; role: string }[] }>(
        '/admin/users?role=master&limit=100'
      ),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      apiPatch<Order>(`/admin/orders/${id}/status`, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      const prev = queryClient.getQueryData<OrdersListRes>(['orders', page, limit, status, from, to, masterId, orgId, search]);
      if (prev) {
        queryClient.setQueryData<OrdersListRes>(
          ['orders', page, limit, status, from, to, masterId, orgId, search],
          {
            ...prev,
            items: prev.items.map((o) =>
              o.id === id ? { ...o, status } : o
            ),
          }
        );
      }
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      toast.error(getErrorMessage(err));
      if (ctx?.prev) {
        queryClient.setQueryData(
          ['orders', page, limit, status, from, to, masterId, orgId, search],
          ctx.prev
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
    },
  });

  const masterOptions = masters?.items ?? [];
  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFiltersCount = [status, masterId, from, to, search.trim()].filter(Boolean).length;
  const clearFilters = () => {
    setStatus('');
    setMasterId('');
    setFrom('');
    setTo('');
    setSearch('');
    setPage(1);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;
  const pageNumbers = (() => {
    const p: number[] = [];
    const show = 3;
    let start = Math.max(1, page - 1);
    const end = Math.min(totalPages, start + show - 1);
    if (end - start + 1 < show) start = Math.max(1, end - show + 1);
    for (let i = start; i <= end; i++) p.push(i);
    return p;
  })();

  const invalidateOrders = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const handleExportOrdersExcel = async () => {
    try {
      const now = new Date();
      const fromDate = from ? new Date(from) : startOfMonth(now);
      const toDate = to ? new Date(to) : endOfMonth(now);
      const fromStr = format(fromDate, 'yyyy-MM-dd');
      const toStr = format(toDate, 'yyyy-MM-dd');
      const ordersData = await apiGet<{
        orders: {
          created_at: string;
          master_fullname: string;
          vehicle_plate: string;
          vehicle_model: string;
          owner_name: string;
          client_phone: string;
          total_amount: number;
          status: string;
          items: { name: string; type: string; quantity: number; price: number }[];
        }[];
      }>(`/admin/reports/orders?from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`);
      const orders = ordersData?.orders ?? [];
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
      const rows = orders.map((o) => {
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
        title: `Buyurtmalar: ${fromStr} — ${toStr}`,
        headers,
        rows,
        colWidths: [18, 18, 14, 16, 22, 14, 45, 14, 12],
      });
      downloadWorkbook(wb, `Buyurtmalar_${fromStr}_${toStr}.xlsx`);
      toast.success('Excel fayl yuklandi');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="space-y-5">
      {/* PAGE HEADER */}
      <div className="mb-5 border-b border-[var(--border)] pb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-1)]">
              Buyurtmalar
            </h1>
            <p className="mt-0.5 text-[13px] text-[var(--text-3)]">
              Jami {total} ta buyurtma
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportOrdersExcel}>
              <FileDown className="mr-2 h-4 w-4" />
              Excel yuklab olish
            </Button>
            <Button
              onClick={() => setNewOrderOpen(true)}
              className="shrink-0"
            >
              <Plus className="mr-2 h-4 w-4" />
              Yangi buyurtma
            </Button>
          </div>
        </div>
      </div>

      {/* COLLAPSIBLE FILTERS */}
      <Card>
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--bg-2)]"
        >
          <span className="flex items-center gap-2 font-medium text-[var(--text-1)]">
            Filtrlar
            {activeFiltersCount > 0 && (
              <span className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-xs text-[var(--accent)]">
                {activeFiltersCount}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn('h-5 w-5 text-[var(--text-3)] transition-transform', filtersOpen && 'rotate-180')}
          />
        </button>
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-200 ease-in-out',
            filtersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          )}
        >
          <div className="overflow-hidden">
            <CardContent className="flex flex-wrap gap-4 border-t border-[var(--border)] pt-4">
              <div className="space-y-2">
                <Label>Holat</Label>
                <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Barchasi" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Usta</Label>
                <Select value={masterId || 'all'} onValueChange={(v) => setMasterId(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Barchasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barchasi</SelectItem>
                    {masterOptions.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.fullname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dan</Label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-2">
                <Label>Gacha</Label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-2">
                <Label>Qidiruv</Label>
                <Input
                  placeholder="Mijoz ismi yoki buyurtma raqami"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64"
                />
              </div>
              {activeFiltersCount > 0 && (
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Filterni tozalash
                  </Button>
                </div>
              )}
            </CardContent>
          </div>
        </div>
      </Card>

      {/* JADVAL */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)]">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="animate-shimmer h-[48px] border-b border-[var(--border)] last:border-b-0"
                  style={{ animationDelay: `${i * 0.05}s` }}
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-2)] text-[var(--text-3)]">
                <Search className="h-8 w-8" />
              </div>
              <p className="font-semibold text-[var(--text-1)]">Ma&apos;lumot topilmadi</p>
              <p className="text-sm text-[var(--text-3)]">Filtrlarni o&apos;zgartiring yoki yangi buyurtma qo&apos;shing</p>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Filterni tozalash
              </Button>
            </div>
          ) : (
            <>
              <OrderTable
                orders={items}
                onRowClick={(o) => setSelectedOrder(o)}
                onStatusChange={(order, newStatus) =>
                  statusMutation.mutate({ id: order.id, status: newStatus })
                }
                isUpdating={(id) => statusMutation.isPending && statusMutation.variables?.id === id}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-3">
                <span className="text-sm text-[var(--text-3)]">
                  Jami: {total} ta
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Oldingi
                  </Button>
                  {pageNumbers.map((n) => (
                    <Button
                      key={n}
                      variant={n === page ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        'min-w-[2rem]',
                        n === page && 'bg-[var(--accent)] text-white hover:opacity-90'
                      )}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!data || page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Keyingi →
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedOrder && (
        <OrderDetail
          orderId={selectedOrder.id}
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      <NewOrderDialog
        open={newOrderOpen}
        onClose={() => setNewOrderOpen(false)}
        onSuccess={() => {
          setNewOrderOpen(false);
          invalidateOrders();
        }}
      />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Content />
    </Suspense>
  );
}
