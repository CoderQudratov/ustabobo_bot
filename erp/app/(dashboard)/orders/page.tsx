'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/lib/api';
import type { OrdersListRes, Order, OrderStatus } from '@/lib/types';
import { OrderTable } from '@/components/orders/OrderTable';
import { OrderDetail } from '@/components/orders/OrderDetail';
import { NewOrderDialog } from '@/components/orders/NewOrderDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus } from 'lucide-react';

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
  const limit = 20;
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
    onError: (_err, _vars, ctx) => {
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

  const invalidateOrders = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Buyurtmalar</h1>
          <span className="rounded-full bg-muted px-3 py-0.5 text-sm font-medium">
            {total} ta
          </span>
        </div>
        <Button onClick={() => setNewOrderOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yangi buyurtma
        </Button>
      </div>

      {/* FILTER PANELI */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtrlar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
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
        </CardContent>
      </Card>

      {/* JADVAL */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <>
              <OrderTable
                orders={data?.items ?? []}
                onRowClick={(o) => setSelectedOrder(o)}
                onStatusChange={(order, newStatus) =>
                  statusMutation.mutate({ id: order.id, status: newStatus })
                }
                isUpdating={(id) => statusMutation.isPending && statusMutation.variables?.id === id}
              />
              <div className="flex items-center justify-between border-t px-4 py-2">
                <span className="text-sm text-muted-foreground">
                  Jami: {total} ta
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Oldingi
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data || page * limit >= data.total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Keyingi
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
