'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { OrdersListRes, Order } from '@/lib/types';
import { OrderTable } from '@/components/orders/OrderTable';
import { OrderDetail } from '@/components/orders/OrderDetail';
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

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [masterId, setMasterId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (status) params.set('status', status);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (masterId) params.set('master_id', masterId);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, limit, status, from, to, masterId],
    queryFn: () => apiGet<OrdersListRes>(`/admin/orders?${params}`),
  });

  const { data: masters } = useQuery({
    queryKey: ['users', 'masters'],
    queryFn: () =>
      apiGet<{ items: { id: string; fullname: string; role: string }[] }>(
        '/admin/users?role=master&limit=100'
      ),
  });

  const masterOptions = masters?.items ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Buyurtmalar</h1>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Filtrlar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Barchasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barchasi</SelectItem>
                <SelectItem value="completed">Tugallandi</SelectItem>
                <SelectItem value="cancelled">Bekor qilindi</SelectItem>
                <SelectItem value="waiting_customer_confirmation">Mijoz tasdiqi</SelectItem>
                <SelectItem value="working">Ishlanyapti</SelectItem>
                <SelectItem value="draft">Qoralama</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dan</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-2">
            <Label>Gacha</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
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
                  <SelectItem key={m.id} value={m.id}>{m.fullname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <>
              <OrderTable orders={data?.items ?? []} onRowClick={(o) => setSelectedOrder(o)} />
              <div className="flex items-center justify-between border-t px-4 py-2">
                <span className="text-sm text-muted-foreground">Jami: {data?.total ?? 0}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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
        <OrderDetail orderId={selectedOrder.id} open={!!selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}
