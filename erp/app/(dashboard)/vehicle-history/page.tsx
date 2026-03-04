'use client';

import { useState, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type Order = { id: string; created_at: string; total_amount: string; master?: { fullname: string }; orderItems: { item_type: string; quantity: number; product?: { name: string }; service?: { name: string } }[] };
type Res = { vehicle: { plate_number: string; model: string }; orders: Order[] };

function Content() {
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get('vehicle_id') ?? '';
  const [inputId, setInputId] = useState(vehicleId);

  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-history', vehicleId],
    queryFn: () => apiGet<Res>(`/admin/vehicles/${vehicleId}/history`),
    enabled: !!vehicleId,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Mashina tarixi</h1>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Mashina ID</Label>
              <Input value={inputId} onChange={(e) => setInputId(e.target.value)} className="w-64" />
            </div>
            <Button onClick={() => (window.location.href = `/vehicle-history?vehicle_id=${encodeURIComponent(inputId)}`)}>Qidirish</Button>
          </div>
        </CardContent>
      </Card>
      {vehicleId && (isLoading ? <Skeleton className="h-64 w-full" /> : data ? (
        <div className="space-y-4">
          <Card><CardHeader><CardTitle>{data.vehicle.plate_number} — {data.vehicle.model}</CardTitle></CardHeader></Card>
          <Card>
            <CardHeader><CardTitle>Buyurtmalar</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {data.orders.map((o) => (
                  <li key={o.id} className="border-b pb-4">
                    <p>{new Date(o.created_at).toLocaleString('uz-UZ')} — {Number(o.total_amount).toLocaleString('uz-UZ')} so‘m. Usta: {o.master?.fullname ?? '—'}</p>
                  </li>
                ))}
                {data.orders.length === 0 && <li className="text-muted-foreground">Yo‘q</li>}
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : <p className="text-muted-foreground">Topilmadi</p>)}
    </div>
  );
}

export default function VehicleHistoryPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Content />
    </Suspense>
  );
}
