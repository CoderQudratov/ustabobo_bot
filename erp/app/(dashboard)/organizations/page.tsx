'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiDelete } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Link from 'next/link';
import { Eye, Pencil, Plus, Trash2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
      apiGet<OrganizationsListRes>(`/admin/organizations?page=${page}&limit=10`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/organizations/${id}`),
    onSuccess: () => {
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('O‘chirildi');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total ?? 0;
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((o) => o.name.toLowerCase().includes(q));
  }, [items, search]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 10)) : 1;
  const pageNumbers = (() => {
    const p: number[] = [];
    const show = 3;
    let start = Math.max(1, page - 1);
    const end = Math.min(totalPages, start + show - 1);
    if (end - start + 1 < show) start = Math.max(1, end - show + 1);
    for (let i = start; i <= end; i++) p.push(i);
    return p;
  })();

  return (
    <div className="space-y-5">
      <div className="mb-5 border-b border-[var(--border)] pb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-1)]">Tashkilotlar</h1>
            <p className="mt-0.5 text-[13px] text-[var(--text-3)]">
              Jami {total} ta tashkilot
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Yangi tashkilot
          </Button>
        </div>
      </div>

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
            <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)]">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="animate-shimmer h-[48px] border-b border-[var(--border)] last:border-b-0"
                />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-2)] text-[var(--text-3)]">
                <Building2 className="h-8 w-8" />
              </div>
              <p className="font-semibold text-[var(--text-1)]">Ma&apos;lumot topilmadi</p>
              <p className="text-sm text-[var(--text-3)]">Qidiruvni o&apos;zgartiring</p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13.5px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--bg-2)]">
                        <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">Tashkilot nomi</th>
                        <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">Telefon</th>
                        <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">Mashinalari soni</th>
                        <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">Qarz summasi</th>
                        <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">Holati</th>
                        <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">Amallar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((o) => (
                        <tr
                          key={o.id}
                          className="border-b border-[var(--border)] transition-colors hover:bg-[var(--bg-2)]"
                        >
                          <td className="px-4 py-[13px]">
                            <Link
                              href={`/organizations/${o.id}`}
                              className="font-medium text-[var(--text-1)] hover:underline"
                            >
                              {o.name}
                            </Link>
                          </td>
                          <td className="px-4 py-[13px] font-mono text-[var(--text-2)]">{o.phone}</td>
                          <td className="px-4 py-[13px] text-[var(--text-2)]">
                            {o.vehicle_count != null ? o.vehicle_count : '—'}
                          </td>
                          <td className="px-4 py-[13px] font-mono font-semibold text-[var(--success)]">
                            {formatSom(Number(o.balance_due))}
                          </td>
                          <td className="px-4 py-[13px]">
                            <Badge variant={o.is_active ? 'default' : 'secondary'}>
                              {o.is_active ? 'Aktiv' : 'Nofaol'}
                            </Badge>
                          </td>
                          <td className="px-4 py-[13px] text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-[30px] w-[30px] rounded-md text-blue-500 hover:bg-blue-500/10" asChild>
                                <Link href={`/organizations/${o.id}`} title="Ko'rish">
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-[30px] w-[30px] rounded-md text-amber-500 hover:bg-amber-500/10" asChild>
                                <Link href={`/organizations/${o.id}`} title="Tahrirlash">
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-[30px] w-[30px] rounded-md text-red-500 hover:bg-red-500/10"
                                title="O'chirish"
                                onClick={() => setDeleteId(o.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-3">
                <span className="text-sm text-[var(--text-3)]">
                  Jami: {total}
                  {search.trim() && ` (filtr: ${filteredItems.length})`}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-40 disabled:cursor-not-allowed">
                    ← Oldingi
                  </Button>
                  {pageNumbers.map((n) => (
                    <Button
                      key={n}
                      variant={n === page ? 'default' : 'ghost'}
                      size="sm"
                      className={cn('min-w-[2rem]', n === page && 'bg-[var(--accent)] text-white hover:opacity-90')}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </Button>
                  ))}
                  <Button variant="ghost" size="sm" disabled={!data || page >= totalPages} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-40 disabled:cursor-not-allowed">
                    Keyingi →
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
