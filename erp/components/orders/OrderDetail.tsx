'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import type { Order } from '@/lib/types';
import { orderStatusLabel } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

type Master = { id: string; fullname: string };
type Service = { id: string; name: string; price: string };
type Org = { id: string; name: string };
type Vehicle = { id: string; plate_number: string; model: string };

/** Editable row for PATCH order_items */
export interface OrderItemRow {
  id?: string;
  item_type: 'service' | 'product' | 'manual_product';
  service_id?: string | null;
  product_id?: string | null;
  item_name?: string | null;
  quantity: number;
  price_at_time: number;
  _displayName?: string;
}

function orderToRows(order: Order): OrderItemRow[] {
  return order.orderItems.map((i) => ({
    id: i.id,
    item_type: i.item_type as 'service' | 'product' | 'manual_product',
    service_id: i.service_id ?? null,
    product_id: i.product_id ?? null,
    item_name: i.item_name ?? null,
    quantity: i.quantity,
    price_at_time: Number(i.price_at_time),
    _displayName:
      (i.item_type === 'service' && i.service?.name) ||
      (i.item_type === 'product' && i.product?.name) ||
      i.item_name ||
      '—',
  }));
}

export function OrderDetail({
  orderId,
  open,
  onClose,
}: {
  orderId: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => apiGet<Order>(`/admin/orders/${orderId}`),
    enabled: open && !!orderId,
  });

  const [mainForm, setMainForm] = useState({
    client_name: '',
    client_phone: '',
    car_number: '',
    car_model: '',
    master_id: '',
    organization_id: '',
    vehicle_id: '',
    delivery_needed: false,
  });
  const [items, setItems] = useState<OrderItemRow[]>([]);

  useEffect(() => {
    if (order) {
      setMainForm({
        client_name: order.client_name,
        client_phone: order.client_phone,
        car_number: order.car_number,
        car_model: order.car_model ?? '',
        master_id: order.master_id,
        organization_id: order.organization_id ?? '',
        vehicle_id: order.vehicle_id ?? '',
        delivery_needed: order.delivery_needed,
      });
      setItems(orderToRows(order));
    }
  }, [order]);

  const saveMutation = useMutation({
    mutationFn: (payload: {
      main?: Partial<typeof mainForm>;
      order_items?: OrderItemRow[];
    }) => {
      const body: Record<string, unknown> = {};
      if (payload.main) {
        if (payload.main.client_name !== undefined) body.client_name = payload.main.client_name;
        if (payload.main.client_phone !== undefined) body.client_phone = payload.main.client_phone;
        if (payload.main.car_number !== undefined) body.car_number = payload.main.car_number;
        if (payload.main.car_model !== undefined) body.car_model = payload.main.car_model;
        if (payload.main.master_id !== undefined) body.master_id = payload.main.master_id;
        if (payload.main.organization_id !== undefined)
          body.organization_id = payload.main.organization_id || null;
        if (payload.main.vehicle_id !== undefined)
          body.vehicle_id = payload.main.vehicle_id || null;
        if (payload.main.delivery_needed !== undefined)
          body.delivery_needed = payload.main.delivery_needed;
      }
      if (payload.order_items !== undefined) {
        body.order_items = payload.order_items.map((r) => ({
          id: r.id,
          item_type: r.item_type,
          service_id: r.service_id || undefined,
          product_id: r.product_id || undefined,
          item_name: r.item_name || undefined,
          quantity: r.quantity,
          price_at_time: r.price_at_time,
        }));
      }
      return apiPatch<Order>(`/admin/orders/${orderId}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Saqlandi');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const recalcMutation = useMutation({
    mutationFn: () => apiPost(`/admin/orders/${orderId}/recalculate-fees`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Ish haqi qayta hisoblandi');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleSaveMain = () => {
    saveMutation.mutate({ main: mainForm });
  };

  const handleSaveItems = () => {
    if (items.length === 0) {
      toast.error('Kamida bitta pozitsiya bo‘lishi kerak');
      return;
    }
    saveMutation.mutate({ order_items: items });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buyurtma #{orderId.slice(0, 8)}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : order ? (
          <OrderDetailBody
            order={order}
            mainForm={mainForm}
            setMainForm={setMainForm}
            items={items}
            setItems={setItems}
            onSaveMain={handleSaveMain}
            onSaveItems={handleSaveItems}
            onRecalculateFees={() => recalcMutation.mutate()}
            isRecalculating={recalcMutation.isPending}
            isSaving={saveMutation.isPending}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function OrderDetailBody({
  order,
  mainForm,
  setMainForm,
  items,
  setItems,
  onSaveMain,
  onSaveItems,
  onRecalculateFees,
  isRecalculating,
  isSaving,
}: {
  order: Order;
  mainForm: {
    client_name: string;
    client_phone: string;
    car_number: string;
    car_model: string;
    master_id: string;
    organization_id: string;
    vehicle_id: string;
    delivery_needed: boolean;
  };
  setMainForm: React.Dispatch<React.SetStateAction<typeof mainForm>>;
  items: OrderItemRow[];
  setItems: React.Dispatch<React.SetStateAction<OrderItemRow[]>>;
  onSaveMain: () => void;
  onSaveItems: () => void;
  onRecalculateFees: () => void;
  isRecalculating: boolean;
  isSaving: boolean;
}) {
  const { data: masters } = useQuery({
    queryKey: ['users', 'masters'],
    queryFn: () =>
      apiGet<{ items: Master[] }>('/admin/users?role=master&limit=100'),
  });
  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => apiGet<{ items: Service[] }>('/admin/services?limit=100'),
  });
  const { data: orgsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: () =>
      apiGet<{ items: Org[] }>('/admin/organizations?limit=100'),
  });
  const orgId = mainForm.organization_id;
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles', orgId],
    queryFn: () =>
      apiGet<{ items: Vehicle[] }>(
        `/admin/organizations/${orgId}/vehicles?limit=100`
      ),
    enabled: !!orgId,
  });

  const masterList = masters?.items ?? [];
  const serviceList = servicesData?.items ?? [];
  const orgList = orgsData?.items ?? [];
  const vehicleList = vehiclesData?.items ?? [];

  const updateItem = (index: number, patch: Partial<OrderItemRow>) => {
    setItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addManualItem = () => {
    setItems((prev) => [
      ...prev,
      {
        item_type: 'manual_product',
        item_name: 'Yangi pozitsiya',
        quantity: 1,
        price_at_time: 0,
        _displayName: 'Yangi pozitsiya',
      },
    ]);
  };

  const [serviceSelectValue, setServiceSelectValue] = useState('');
  const addServiceItem = (serviceId: string) => {
    const s = serviceList.find((x) => x.id === serviceId);
    if (!s) return;
    setItems((prev) => [
      ...prev,
      {
        item_type: 'service',
        service_id: serviceId,
        quantity: 1,
        price_at_time: Number(s.price),
        _displayName: s.name,
      },
    ]);
    setServiceSelectValue('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
          {orderStatusLabel(order.status)}
        </Badge>
        {order.status === 'completed' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRecalculateFees}
            disabled={isRecalculating}
          >
            {isRecalculating ? 'Hisoblanmoqda...' : 'Ish haqi qayta hisoblash'}
          </Button>
        )}
      </div>

      <Tabs defaultValue="asosiy">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="asosiy">Asosiy</TabsTrigger>
          <TabsTrigger value="xizmatlar">Xizmatlar</TabsTrigger>
        </TabsList>
        <TabsContent value="asosiy" className="space-y-4 pt-3">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <Label>Mijoz</Label>
              <Input
                value={mainForm.client_name}
                onChange={(e) =>
                  setMainForm((f) => ({ ...f, client_name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input
                value={mainForm.client_phone}
                onChange={(e) =>
                  setMainForm((f) => ({ ...f, client_phone: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Mashina raqami</Label>
              <Input
                value={mainForm.car_number}
                onChange={(e) =>
                  setMainForm((f) => ({ ...f, car_number: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Mashina modeli</Label>
              <Input
                value={mainForm.car_model}
                onChange={(e) =>
                  setMainForm((f) => ({ ...f, car_model: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Usta</Label>
              <Select
                value={mainForm.master_id}
                onValueChange={(v) =>
                  setMainForm((f) => ({ ...f, master_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {masterList.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.fullname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tashkilot</Label>
              <Select
                value={mainForm.organization_id || '__none__'}
                onValueChange={(v) =>
                  setMainForm((f) => ({
                    ...f,
                    organization_id: v === '__none__' ? '' : v,
                    vehicle_id: '',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {orgList.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mashina (tashkilot)</Label>
              <Select
                value={mainForm.vehicle_id || '__none__'}
                onValueChange={(v) =>
                  setMainForm((f) => ({
                    ...f,
                    vehicle_id: v === '__none__' ? '' : v,
                  }))
                }
                disabled={!mainForm.organization_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {vehicleList.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate_number} — {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="delivery"
                checked={mainForm.delivery_needed}
                onChange={(e) =>
                  setMainForm((f) => ({
                    ...f,
                    delivery_needed: e.target.checked,
                  }))
                }
                className="rounded"
              />
              <Label htmlFor="delivery">Yetkazib berish</Label>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Jami: {Number(order.total_amount).toLocaleString('uz-UZ')} so‘m
          </p>
          <Button onClick={onSaveMain} disabled={isSaving}>
            Saqlash
          </Button>
        </TabsContent>

        <TabsContent value="xizmatlar" className="space-y-3 pt-3">
          <div className="overflow-x-auto rounded-md border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-2)]">
                  <th className="p-2 text-left font-medium">Nomi</th>
                  <th className="p-2 text-left font-medium">Tur</th>
                  <th className="p-2 w-20 text-right">Soni</th>
                  <th className="p-2 w-28 text-right">Narx</th>
                  <th className="p-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((row, index) => (
                  <tr key={row.id ?? `new-${index}`} className="border-b border-[var(--border)]">
                    <td className="p-2">
                      {row.item_type === 'manual_product' ? (
                        <Input
                          className="h-8 text-sm"
                          value={row.item_name ?? ''}
                          onChange={(e) =>
                            updateItem(index, {
                              item_name: e.target.value,
                              _displayName: e.target.value,
                            })
                          }
                        />
                      ) : (
                        <span>{row._displayName ?? '—'}</span>
                      )}
                    </td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-xs">
                        {row.item_type === 'service'
                          ? 'Xizmat'
                          : row.item_type === 'product'
                            ? 'Zapchast'
                            : 'Qo‘lda'}
                      </Badge>
                    </td>
                    <td className="p-2 text-right">
                      <Input
                        type="number"
                        min={1}
                        className="h-8 w-18 text-right text-sm"
                        value={row.quantity}
                        onChange={(e) =>
                          updateItem(index, {
                            quantity: parseInt(e.target.value, 10) || 1,
                          })
                        }
                      />
                    </td>
                    <td className="p-2 text-right">
                      <Input
                        type="number"
                        min={0}
                        className="h-8 w-28 text-right text-sm"
                        value={row.price_at_time || ''}
                        onChange={(e) =>
                          updateItem(index, {
                            price_at_time: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeItem(index)}
                      >
                        ×
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={serviceSelectValue} onValueChange={(v) => { setServiceSelectValue(v); addServiceItem(v); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Xizmat qo‘shish" />
              </SelectTrigger>
              <SelectContent>
                {serviceList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {Number(s.price).toLocaleString('uz-UZ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={addManualItem}>
              Qo‘lda pozitsiya qo‘shish
            </Button>
          </div>
          <Button onClick={onSaveItems} disabled={isSaving}>
            Xizmatlarni saqlash
          </Button>
        </TabsContent>
      </Tabs>

      {order.car_photo_url && (
        <div className="h-40 overflow-hidden rounded-md border border-[var(--border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={order.car_photo_url}
            alt="Mashina"
            className="h-full w-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
