'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type Order = {
  id: string;
  completed_at: string | null;
  total_amount: string;
  master?: { fullname: string };
  orderItems: { item_type: string; quantity: number; price_at_time: string; product?: { name: string }; service?: { name: string }; item_name: string | null }[];
};
type ClientHistoryRes = { orders: Order[] };

export default function ClientHistoryPage() {
  const [phone, setPhone] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const params = new URLSearchParams();
  if (phone) params.set('phone', phone);
  if (carNumber) params.set('car_number', carNumber);
  const queryString = params.toString();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['client-history', queryString],
    queryFn: () => apiGet<ClientHistoryRes>(`/admin/clients/history?${queryString}`),
    enabled: submitted && (!!phone || !!carNumber),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone || carNumber) setSubmitted(true);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Mijoz tarixi</h1>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input placeholder="+998901234567" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-48" />
            </div>
            <div className="space-y-2">
              <Label>Mashina raqami</Label>
              <Input placeholder="01A123AB" value={carNumber} onChange={(e) => setCarNumber(e.target.value)} className="w-40" />
            </div>
            <Button type="submit">Qidirish</Button>
          </form>
          <p className="mt-2 text-sm text-muted-foreground">Kamida bittasini kiriting.</p>
        </CardContent>
      </Card>
      {submitted && (phone || carNumber) && (
        isLoading || isFetching ? (
          <Skeleton className="h-64 w-full" />
        ) : data ? (
          <Card>
            <CardHeader><CardTitle>Buyurtmalar</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {data.orders.map((o) => (
                  <li key={o.id} className="border-b pb-4">
                    <p className="font-medium">{o.completed_at ? new Date(o.completed_at).toLocaleString('uz-UZ') : '—'} — {Number(o.total_amount).toLocaleString('uz-UZ')} so‘m</p>
                    <p className="text-muted-foreground">Usta: {o.master?.fullname ?? '—'}</p>
                    <p className="text-sm">
                      {o.orderItems.map((i) => {
                        const name = i.service?.name ?? i.product?.name ?? i.item_name ?? '—';
                        return `${name} × ${i.quantity}; `;
                      })}
                    </p>
                  </li>
                ))}
                {data.orders.length === 0 && <li className="text-muted-foreground">Buyurtmalar topilmadi</li>}
              </ul>
            </CardContent>
          </Card>
        ) : null
      )}
    </div>
  );
}
