'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiDelete } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Link from 'next/link';
import { OrgFormDialog } from '@/components/organizations/OrgFormDialog';
import { formatSom } from '@/lib/dashboard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/** Tashkilot (list API response) */
export interface Organization {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  payment_type: string;
  balance_due: string;
  is_active: boolean;
  /** Mashinalar soni — backend qaytarsa ko‘rsatiladi */
  vehicle_count?: number;
}

/** GET /admin/organizations response */
export interface OrganizationsListRes {
  items: Organization[];
  total: number;
  page: number;
  limit: number;
}

export default function OrganizationsPage() {
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['organizations', page],
    queryFn: () =>
      apiGet<OrganizationsListRes>(`/admin/organizations?page=${page}&limit=20`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/organizations/${id}`),
    onSuccess: () => {
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('O‘chirildi');
    },
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((o) => o.name.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Tashkilotlar</h1>
        <Button onClick={() => setAddOpen(true)}>Yangi tashkilot</Button>
      </div>

      {/* Qidiruv — tashkilot nomi bo‘yicha (frontend filter) */}
      <div className="mb-4">
        <Input
          type="search"
          placeholder="Tashkilot nomi bo‘yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {addOpen && (
        <OrgFormDialog
          onSuccess={() => {
            setAddOpen(false);
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
            toast.success('Qo‘shildi');
          }}
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
                      <th className="p-3 text-left font-medium">Tashkilot nomi</th>
                      <th className="p-3 text-left font-medium">Telefon</th>
                      <th className="p-3 text-left font-medium">Mashinalari soni</th>
                      <th className="p-3 text-left font-medium">Qarz summasi</th>
                      <th className="p-3 text-left font-medium">Holati</th>
                      <th className="p-3 text-right font-medium">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-6 text-center text-muted-foreground"
                        >
                          {items.length === 0
                            ? 'Tashkilotlar yo‘q'
                            : 'Qidiruv bo‘yicha natija topilmadi'}
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((o) => (
                        <tr key={o.id} className="border-b">
                          <td className="p-3">
                            <Link
                              href={`/organizations/${o.id}`}
                              className="font-medium hover:underline"
                            >
                              {o.name}
                            </Link>
                          </td>
                          <td className="p-3">{o.phone}</td>
                          <td className="p-3">
                            {o.vehicle_count != null
                              ? o.vehicle_count
                              : '—'}
                          </td>
                          <td className="p-3">
                            {formatSom(Number(o.balance_due))}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                o.is_active ? 'default' : 'secondary'
                              }
                            >
                              {o.is_active ? 'Aktiv' : 'Nofaol'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/organizations/${o.id}`}>
                                  Ko‘rish →
                                </Link>
                              </Button>
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/organizations/${o.id}`}>
                                  Tahrirlash
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(o.id)}
                              >
                                O‘chirish
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2">
                <span className="text-muted-foreground">
                  Jami: {data?.total ?? 0}
                  {search.trim() && ` (filtr: ${filteredItems.length})`}
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
                    disabled={!data || page * 20 >= data.total}
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

      {/* O‘chirishni tasdiqlash */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tashkilotni o‘chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Ushbu tashkilot va unga tegishli ma’lumotlar o‘chiriladi. Amalni tasdiqlaysizmi?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Kutilmoqda...' : 'O‘chirish'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
