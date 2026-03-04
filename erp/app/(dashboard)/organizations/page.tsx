'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Link from 'next/link';
import { OrgFormDialog } from '@/components/organizations/OrgFormDialog';

type Org = { id: string; name: string; contact_person: string; phone: string; payment_type: string; balance_due: string; is_active: boolean };
type Res = { items: Org[]; total: number; page: number; limit: number };

export default function OrganizationsPage() {
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['organizations', page],
    queryFn: () => apiGet<Res>(`/admin/organizations?page=${page}&limit=20`),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tashkilotlar</h1>
        <Button onClick={() => setAddOpen(true)}>Yangi tashkilot</Button>
      </div>
      {addOpen && (
        <OrgFormDialog
          onSuccess={() => { setAddOpen(false); queryClient.invalidateQueries({ queryKey: ['organizations'] }); toast.success('Qo‘shildi'); }}
          onCancel={() => setAddOpen(false)}
        />
      )}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium">Nomi</th>
                      <th className="p-3 text-left font-medium">Kontakt</th>
                      <th className="p-3 text-left font-medium">Telefon</th>
                      <th className="p-3 text-left font-medium">To‘lov turi</th>
                      <th className="p-3 text-left font-medium">Qarz</th>
                      <th className="p-3 text-left font-medium">Aktiv</th>
                      <th className="p-3 text-right font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.items ?? []).map((o) => (
                      <tr key={o.id} className="border-b">
                        <td className="p-3">{o.name}</td>
                        <td className="p-3">{o.contact_person}</td>
                        <td className="p-3">{o.phone}</td>
                        <td className="p-3">{o.payment_type === 'corporate_debt' ? 'Korporativ qarz' : 'Naqd'}</td>
                        <td className="p-3">{Number(o.balance_due).toLocaleString('uz-UZ')} so‘m</td>
                        <td className="p-3">{o.is_active ? 'Ha' : 'Yo‘q'}</td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/organizations/${o.id}`}>Mashinalar</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between border-t px-4 py-2">
                <span className="text-muted-foreground">Jami: {data?.total ?? 0}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Oldingi</Button>
                  <Button variant="outline" size="sm" disabled={!data || page * 20 >= data.total} onClick={() => setPage((p) => p + 1)}>Keyingi</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
