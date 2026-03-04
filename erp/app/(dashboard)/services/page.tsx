'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type Service = { id: string; name: string; price: string };
type Res = { items: Service[]; total: number; page: number; limit: number };

export default function ServicesPage() {
  const [page] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['services', page],
    queryFn: () => apiGet<Res>(`/admin/services?page=${page}&limit=50`),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Xizmatlar</h1>
      <Card>
        <CardContent className="p-0">
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left">Nomi</th>
                  <th className="p-3 text-right">Narxi</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="p-3">{s.name}</td>
                    <td className="p-3 text-right">{Number(s.price).toLocaleString('uz-UZ')} so‘m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
