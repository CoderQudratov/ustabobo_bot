'use client';

import { useState } from 'react';
import { format } from 'date-fns';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatSom } from '@/lib/dashboard';
import { orderStatusLabel, type OrderStatus } from '@/lib/types';
import {
  useClientHistory,
  useClientDetail,
  defaultFrom,
  defaultTo,
} from '@/hooks/useClientHistory';

export default function ClientHistoryPage() {
  const [filters, setFilters] = useState({
    from: defaultFrom,
    to: defaultTo,
    status: '',
    search: '',
    page: 1,
  });
  const [detailPhone, setDetailPhone] = useState<string | null>(null);

  const { data, isLoading } = useClientHistory(filters);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const limit = 10;

  return (
    <div className="space-y-6">
      <div className="mb-5 border-b border-[var(--border)] pb-5">
        <h1 className="text-xl font-bold text-[var(--text-1)]">Mijoz tarixi</h1>
        <p className="mt-0.5 text-[13px] text-[var(--text-3)]">Buyurtmalar bo‘yicha qidiruv</p>
      </div>

      {/* Qidiruv */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <Label>Qidiruv (ism yoki telefon)</Label>
            <Input
              placeholder="Mijoz ismi yoki telefon raqami..."
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))
              }
              className="max-w-md"
            />
          </div>

          {/* Filter paneli */}
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Dan</Label>
              <Input
                type="date"
                value={filters.from}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))
                }
                className="w-40"
              />
            </div>
            <div>
              <Label>Gacha</Label>
              <Input
                type="date"
                value={filters.to}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))
                }
                className="w-40"
              />
            </div>
            <div>
              <Label>Holat</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(v) =>
                  setFilters((f) => ({
                    ...f,
                    status: v === 'all' ? '' : v,
                    page: 1,
                  }))
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barchasi</SelectItem>
                  <SelectItem value="completed">Tugallangan</SelectItem>
                  <SelectItem value="cancelled">Bekor</SelectItem>
                  <SelectItem value="working">Aktiv (ishlanyapti)</SelectItem>
                  <SelectItem value="waiting_customer_confirmation">
                    Mijoz tasdiqi
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mijozlar jadvali */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-2)]">
                      <th className="p-3 text-left font-medium">Ism</th>
                      <th className="p-3 text-left font-medium">Telegram</th>
                      <th className="p-3 text-left font-medium">Telefon</th>
                      <th className="p-3 text-right font-medium">
                        Jami buyurtmalar
                      </th>
                      <th className="p-3 text-right font-medium">
                        Jami sarflagan
                      </th>
                      <th className="p-3 text-left font-medium">
                        Oxirgi faollik
                      </th>
                      <th className="p-3 text-right font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-6 text-center text-muted-foreground"
                        >
                          Mijozlar topilmadi
                        </td>
                      </tr>
                    ) : (
                      items.map((c) => (
                        <tr key={c.client_phone} className="border-b border-[var(--border)]">
                          <td className="p-3 font-medium">{c.client_name}</td>
                          <td className="p-3 text-muted-foreground">—</td>
                          <td className="p-3">{c.client_phone}</td>
                          <td className="p-3 text-right">
                            {c.total_orders}
                          </td>
                          <td className="p-3 text-right">
                            {formatSom(c.total_spent)}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {format(
                              new Date(c.last_activity),
                              'dd.MM.yyyy HH:mm'
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDetailPhone(c.client_phone)}
                            >
                              Batafsil
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-2">
                <span className="text-muted-foreground">
                  Jami: {total} mijoz
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page <= 1}
                    onClick={() =>
                      setFilters((f) => ({ ...f, page: f.page - 1 }))
                    }
                  >
                    Oldingi
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page * limit >= total}
                    onClick={() =>
                      setFilters((f) => ({ ...f, page: f.page + 1 }))
                    }
                  >
                    Keyingi
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Batafsil dialog */}
      {detailPhone && (
        <ClientDetailDialog
          clientPhone={detailPhone}
          onClose={() => setDetailPhone(null)}
        />
      )}
    </div>
  );
}

// ─── Client detail dialog ──────────────────────────────────────────────────

function ClientDetailDialog({
  clientPhone,
  onClose,
}: {
  clientPhone: string;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useClientDetail(clientPhone);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mijoz batafsil</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : isError ? (
          <p className="py-4 text-center text-destructive">
            Ma’lumot yuklab bo‘lmadi. Qayta urinib ko‘ring.
          </p>
        ) : data ? (
          <div className="space-y-4">
            <div className="grid gap-2 text-sm">
              <p>
                <span className="text-muted-foreground">Ism: </span>
                <span className="font-medium">{data.client.client_name}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Telefon: </span>
                <span>{data.client.client_phone}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Jami buyurtmalar: </span>
                <span className="font-medium">{data.client.total_orders}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Jami sarflagan: </span>
                <span className="font-medium">
                  {formatSom(data.client.total_spent)}
                </span>
              </p>
            </div>

            <div>
              <h4 className="mb-2 font-medium">Buyurtmalar</h4>
              {!data.orders?.length ? (
                <p className="p-4 text-center text-muted-foreground">
                  Bu mijoz uchun buyurtmalar topilmadi
                </p>
              ) : (
                <div className="overflow-x-auto rounded border border-[var(--border)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--bg-2)]">
                        <th className="p-2 text-left font-medium">Sana</th>
                        <th className="p-2 text-left font-medium">Xizmat</th>
                        <th className="p-2 text-left font-medium">Mashina</th>
                        <th className="p-2 text-right font-medium">Summa</th>
                        <th className="p-2 text-left font-medium">Holat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.orders.map((o) => (
                        <tr key={o.id} className="border-b border-[var(--border)]">
                          <td className="p-2">
                            {format(
                              new Date(o.created_at),
                              'dd.MM.yyyy HH:mm'
                            )}
                          </td>
                          <td className="p-2">{o.service_name}</td>
                          <td className="p-2">
                            {o.car_number}
                            {o.car_model ? ` (${o.car_model})` : ''}
                          </td>
                          <td className="p-2 text-right">
                            {formatSom(o.total_amount)}
                          </td>
                          <td className="p-2">
                            <Badge
                              variant={
                                o.status === 'completed'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {orderStatusLabel(o.status as OrderStatus)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
