'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatSom } from '@/lib/dashboard';
import { orderStatusLabel, type OrderStatus } from '@/lib/types';
import type { Order, OrdersListRes } from '@/lib/types';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface OrganizationVehicle {
  id: string;
  plate_number: string;
  model: string;
  is_active: boolean;
  last_service_date?: string | null;
  total_spent?: number | null;
}

export interface OrganizationDetail {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  payment_type: string;
  balance_due: string;
  is_active: boolean;
  vehicles: OrganizationVehicle[];
  address?: string | null;
  stir_inn?: string | null;
  created_at?: string | null;
}

const vehicleSchema = z.object({
  plate_number: z.string().min(1, 'Davlat raqami kiritilishi shart'),
  model: z.string().min(1, 'Model kiritilishi shart'),
  year: z.string().optional(),
  color: z.string().optional(),
  vin: z.string().optional(),
});

const paymentSchema = z.object({
  amount: z.number().min(0.01, 'Summa 0 dan katta bo‘lishi kerak'),
});

const editOrgSchema = z.object({
  name: z.string().min(1),
  contact_person: z.string().min(1),
  phone: z.string().min(1),
  payment_type: z.enum(['cash', 'corporate_debt']),
});

// ─── Page ──────────────────────────────────────────────────────────────────

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    data: org,
    isLoading: orgLoading,
    isError: orgError,
    error: orgErr,
  } = useQuery({
    queryKey: ['organization', id],
    queryFn: () => apiGet<OrganizationDetail>(`/admin/organizations/${id}`),
    enabled: !!id,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'organization', id],
    queryFn: () =>
      apiGet<OrdersListRes>(
        `/admin/orders?organization_id=${id}&limit=10&page=1`
      ),
    enabled: !!id && !!org,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['organization', id] });
    queryClient.invalidateQueries({ queryKey: ['orders', 'organization', id] });
  };

  if (!id) return null;

  if (orgError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
        {orgErr instanceof Error ? orgErr.message : 'Tashkilot yuklanmadi'}
        <div className="mt-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/organizations">← Orqaga</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (orgLoading || !org) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const orders = ordersData?.items ?? [];
  const totalOrders = ordersData?.total ?? 0;
  const totalPaid =
    orders
      .filter((o) => o.status === 'completed')
      .reduce((s, o) => s + Number(o.total_amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Button variant="ghost" size="sm" className="w-fit" asChild>
            <Link href="/organizations">← Orqaga</Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {org.name}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Tahrirlash
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            O‘chirish
          </Button>
        </div>
      </div>

      {/* 2. TASHKILOT MA'LUMOTLARI */}
      <Card>
        <CardHeader>
          <CardTitle>Tashkilot ma’lumotlari</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Nomi: </span>
            <span className="font-medium">{org.name}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Telefon: </span>
            <a href={`tel:${org.phone}`} className="font-medium hover:underline">
              {org.phone}
            </a>
          </div>
          <div>
            <span className="text-muted-foreground">Manzil: </span>
            <span>{org.address ?? '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">STIR/INN: </span>
            <span>{org.stir_inn ?? '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Kontakt shaxs: </span>
            <span>{org.contact_person}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Umumiy buyurtmalar soni: </span>
            <span className="font-medium">{totalOrders}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Jami to‘langan (oxirgi 10 da): </span>
            <span>{formatSom(totalPaid)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Joriy qarz: </span>
            <span className="font-medium">{formatSom(Number(org.balance_due))}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Ro‘yxatga olingan sana: </span>
            <span>
              {org.created_at
                ? new Date(org.created_at).toLocaleDateString('uz-UZ')
                : '—'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3. MASHINALAR */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Mashinalar</CardTitle>
          <Button onClick={() => setAddVehicleOpen(true)}>Mashina qo‘shish</Button>
        </CardHeader>
        <CardContent>
          {org.vehicles.length === 0 ? (
            <p className="text-muted-foreground">Mashinalar yo‘q</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Raqam</th>
                    <th className="p-3 text-left font-medium">Model</th>
                    <th className="p-3 text-left font-medium">Oxirgi servis</th>
                    <th className="p-3 text-left font-medium">Jami sarflangan</th>
                    <th className="p-3 text-right font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {org.vehicles.map((v) => (
                    <tr key={v.id} className="border-b">
                      <td className="p-3 font-medium">{v.plate_number}</td>
                      <td className="p-3">{v.model}</td>
                      <td className="p-3">
                        {v.last_service_date
                          ? new Date(v.last_service_date).toLocaleDateString(
                              'uz-UZ'
                            )
                          : '—'}
                      </td>
                      <td className="p-3">
                        {v.total_spent != null
                          ? formatSom(v.total_spent)
                          : '—'}
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/vehicle-history?vehicle_id=${encodeURIComponent(v.id)}`}
                          >
                            Tarix ko‘rish
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {addVehicleOpen && (
        <AddVehicleDialog
          orgId={id}
          onSuccess={() => {
            setAddVehicleOpen(false);
            invalidate();
            toast.success('Mashina qo‘shildi');
          }}
          onCancel={() => setAddVehicleOpen(false)}
        />
      )}

      {/* 4. BUYURTMALAR TARIXI */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Buyurtmalar tarixi (oxirgi 10)</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/orders?organization_id=${encodeURIComponent(id)}`}>
              Barchasini ko‘rish
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : orders.length === 0 ? (
            <p className="text-muted-foreground">Buyurtmalar yo‘q</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Sana</th>
                    <th className="p-3 text-left font-medium">Xizmat turi</th>
                    <th className="p-3 text-left font-medium">Narx</th>
                    <th className="p-3 text-left font-medium">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <OrderRow key={o.id} order={o} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. QARZ */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Qarz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-2xl font-bold text-destructive md:text-3xl">
            {formatSom(Number(org.balance_due))}
          </p>
          <Button onClick={() => setPaymentOpen(true)}>
            To‘lov qabul qilish
          </Button>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      {editOpen && (
        <EditOrgDialog
          org={org}
          onSuccess={() => {
            setEditOpen(false);
            invalidate();
            toast.success('Saqlandi');
          }}
          onCancel={() => setEditOpen(false)}
        />
      )}

      {/* Payment dialog */}
      {paymentOpen && (
        <PaymentDialog
          orgId={id}
          currentDebt={Number(org.balance_due)}
          onSuccess={() => {
            setPaymentOpen(false);
            invalidate();
            toast.success('To‘lov qabul qilindi');
          }}
          onCancel={() => setPaymentOpen(false)}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tashkilotni o‘chirish</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{org.name}&quot; va unga tegishli ma’lumotlar o‘chiriladi.
              Amalni tasdiqlaysizmi?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor</AlertDialogCancel>
            <DeleteOrgAction
              orgId={id}
              onDone={() => {
                setDeleteOpen(false);
                router.push('/organizations');
              }}
              onError={(msg) => toast.error(msg)}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Order row (xizmat turi = birinchi service/product nomi) ────────────────

function OrderRow({ order }: { order: Order }) {
  const serviceLabel =
    order.orderItems?.find((i) => i.service?.name)?.service?.name ??
    order.orderItems?.find((i) => i.item_name)?.item_name ??
    '—';
  return (
    <tr className="border-b">
      <td className="p-3">
        {new Date(order.created_at).toLocaleDateString('uz-UZ')}
      </td>
      <td className="p-3">{serviceLabel}</td>
      <td className="p-3">{formatSom(Number(order.total_amount))}</td>
      <td className="p-3">
        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
          {orderStatusLabel(order.status as OrderStatus)}
        </Badge>
      </td>
    </tr>
  );
}

// ─── Add vehicle dialog ─────────────────────────────────────────────────────

function AddVehicleDialog({
  orgId,
  onSuccess,
  onCancel,
}: {
  orgId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const form = useForm<z.infer<typeof vehicleSchema>>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plate_number: '',
      model: '',
      year: '',
      color: '',
      vin: '',
    },
  });
  const mutation = useMutation({
    mutationFn: (d: z.infer<typeof vehicleSchema>) =>
      apiPost(`/admin/organizations/${orgId}/vehicles`, {
        plate_number: d.plate_number.trim(),
        model: d.model.trim(),
        ...(d.year ? { year: Number(d.year) } : {}),
        ...(d.color?.trim() ? { color: d.color.trim() } : {}),
        ...(d.vin?.trim() ? { vin: d.vin.trim() } : {}),
      }),
    onSuccess,
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mashina qo‘shish</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
          className="space-y-4"
        >
          <div>
            <Label>Davlat raqami</Label>
            <Input {...form.register('plate_number')} placeholder="01 A 123 AA" />
            {form.formState.errors.plate_number && (
              <p className="text-destructive text-sm">
                {form.formState.errors.plate_number.message}
              </p>
            )}
          </div>
          <div>
            <Label>Model</Label>
            <Input {...form.register('model')} placeholder="Chevrolet Lacetti" />
            {form.formState.errors.model && (
              <p className="text-destructive text-sm">
                {form.formState.errors.model.message}
              </p>
            )}
          </div>
          <div>
            <Label>Yil (ixtiyoriy)</Label>
            <Input type="number" {...form.register('year')} placeholder="2020" />
          </div>
          <div>
            <Label>Rang (ixtiyoriy)</Label>
            <Input {...form.register('color')} placeholder="Oq" />
          </div>
          <div>
            <Label>VIN (ixtiyoriy)</Label>
            <Input {...form.register('vin')} placeholder="1HGBH41JXMN109186" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Bekor
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              Saqlash
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit org dialog ───────────────────────────────────────────────────────

function EditOrgDialog({
  org,
  onSuccess,
  onCancel,
}: {
  org: OrganizationDetail;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const form = useForm<z.infer<typeof editOrgSchema>>({
    resolver: zodResolver(editOrgSchema),
    defaultValues: {
      name: org.name,
      contact_person: org.contact_person,
      phone: org.phone,
      payment_type: org.payment_type as 'cash' | 'corporate_debt',
    },
  });
  const mutation = useMutation({
    mutationFn: (d: z.infer<typeof editOrgSchema>) =>
      apiPatch(`/admin/organizations/${org.id}`, d),
    onSuccess,
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tashkilotni tahrirlash</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
          className="space-y-4"
        >
          <div>
            <Label>Nomi</Label>
            <Input {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-destructive text-sm">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div>
            <Label>Kontakt shaxs</Label>
            <Input {...form.register('contact_person')} />
            {form.formState.errors.contact_person && (
              <p className="text-destructive text-sm">
                {form.formState.errors.contact_person.message}
              </p>
            )}
          </div>
          <div>
            <Label>Telefon</Label>
            <Input {...form.register('phone')} />
            {form.formState.errors.phone && (
              <p className="text-destructive text-sm">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>
          <div>
            <Label>To‘lov turi</Label>
            <Select
              value={form.watch('payment_type')}
              onValueChange={(v) =>
                form.setValue('payment_type', v as 'cash' | 'corporate_debt')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Naqd</SelectItem>
                <SelectItem value="corporate_debt">Korporativ qarz</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Bekor
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              Saqlash
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Payment dialog ────────────────────────────────────────────────────────

function PaymentDialog({
  orgId,
  currentDebt,
  onSuccess,
  onCancel,
}: {
  orgId: string;
  currentDebt: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: 0 },
  });
  const mutation = useMutation({
    mutationFn: (amount: number) =>
      apiPatch(`/admin/organizations/${orgId}`, {
        balance_due: Math.max(0, currentDebt - amount),
      }),
    onSuccess,
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>To‘lov qabul qilish</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Joriy qarz: <strong>{formatSom(currentDebt)}</strong>
        </p>
        <form
          onSubmit={form.handleSubmit((d) => mutation.mutate(d.amount))}
          className="space-y-4"
        >
          <div>
            <Label>Summa (so‘m)</Label>
            <Input
              type="number"
              min={0}
              step={1000}
              {...form.register('amount', { valueAsNumber: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-destructive text-sm">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Bekor
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              Tasdiqlash
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete action (mutation inside AlertDialog) ────────────────────────────

function DeleteOrgAction({
  orgId,
  onDone,
  onError,
}: {
  orgId: string;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const mutation = useMutation({
    mutationFn: () => apiDelete(`/admin/organizations/${orgId}`),
    onSuccess: onDone,
    onError: (e: Error) => onError(getErrorMessage(e)),
  });
  return (
    <AlertDialogAction
      onClick={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      disabled={mutation.isPending}
      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
    >
      {mutation.isPending ? 'Kutilmoqda...' : 'O‘chirish'}
    </AlertDialogAction>
  );
}
