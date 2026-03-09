'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';

type Service = { id: string; name: string; price: string };
type Master = { id: string; fullname: string };
type Org = { id: string; name: string };
type Vehicle = { id: string; plate_number: string; model: string };

const schema = z.object({
  client_name: z.string().min(1, 'Mijoz ismini kiriting'),
  client_phone: z.string().min(1, 'Telefon kiriting'),
  car_number: z.string().min(1, 'Mashina raqamini kiriting'),
  car_model: z.string().optional(),
  master_id: z.string().min(1, 'Ustani tanlang'),
  organization_id: z.string().optional(),
  vehicle_id: z.string().optional(),
  delivery_needed: z.boolean(),
  service_ids: z.array(z.string()).min(1, 'Kamida bitta xizmat tanlang'),
});

type FormData = z.infer<typeof schema>;

export function NewOrderDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [useOrgVehicle, setUseOrgVehicle] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_name: '',
      client_phone: '',
      car_number: '',
      car_model: '',
      master_id: '',
      organization_id: '',
      vehicle_id: '',
      delivery_needed: false,
      service_ids: [],
    },
  });

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => apiGet<{ items: Service[] }>('/admin/services?limit=100'),
    enabled: open,
  });

  const { data: masters } = useQuery({
    queryKey: ['users', 'masters'],
    queryFn: () =>
      apiGet<{ items: Master[] }>('/admin/users?role=master&limit=100'),
    enabled: open,
  });

  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: () =>
      apiGet<{ items: Org[] }>('/admin/organizations?limit=100'),
    enabled: open,
  });

  const orgId = form.watch('organization_id');
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles', orgId],
    queryFn: () =>
      apiGet<Vehicle[] | { items: Vehicle[] }>(`/admin/vehicles?org_id=${orgId}`),
    enabled: open && !!orgId && useOrgVehicle,
  });
  const vehicleList = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData as { items?: Vehicle[] })?.items ?? [];

  const mutation = useMutation({
    mutationFn: (d: FormData) => {
      const payload: Record<string, unknown> = {
        master_id: d.master_id,
        client_name: d.client_name,
        client_phone: d.client_phone,
        car_number: d.car_number,
        car_model: d.car_model || undefined,
        delivery_needed: d.delivery_needed,
        service_ids: d.service_ids,
      };
      if (useOrgVehicle && d.organization_id && d.vehicle_id) {
        payload.organization_id = d.organization_id;
        payload.vehicle_id = d.vehicle_id;
      }
      return apiPost('/admin/orders', payload);
    },
    onSuccess: () => {
      toast.success('Buyurtma yaratildi');
      onSuccess();
      form.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const serviceList = services?.items ?? [];
  const masterList = masters?.items ?? [];
  const orgList = orgs?.items ?? [];

  const selectedServiceIds = form.watch('service_ids') ?? [];

  const handleSubmit = form.handleSubmit((d) => mutation.mutate(d));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yangi buyurtma</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Mijoz ismi</Label>
            <Input {...form.register('client_name')} placeholder="Ism Familiya" />
            {form.formState.errors.client_name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.client_name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Telefon</Label>
            <Input {...form.register('client_phone')} placeholder="+998901234567" />
            {form.formState.errors.client_phone && (
              <p className="text-sm text-destructive">
                {form.formState.errors.client_phone.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useOrgVehicle"
              checked={useOrgVehicle}
              onChange={(e) => {
                setUseOrgVehicle(e.target.checked);
                if (!e.target.checked) {
                  form.setValue('organization_id', '');
                  form.setValue('vehicle_id', '');
                }
              }}
              className="rounded"
            />
            <Label htmlFor="useOrgVehicle">Tashkilot mashinasi</Label>
          </div>

          {useOrgVehicle ? (
            <>
              <div className="space-y-2">
                <Label>Tashkilot</Label>
                <Select
                  value={form.watch('organization_id')}
                  onValueChange={(v) => {
                    form.setValue('organization_id', v);
                    form.setValue('vehicle_id', '');
                    form.setValue('car_number', '');
                    form.setValue('car_model', '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tashkilot tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgList.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mashina</Label>
                <Select
                  value={form.watch('vehicle_id')}
                  onValueChange={(v) => {
                    form.setValue('vehicle_id', v);
                    const veh = vehicleList.find((x) => x.id === v);
                    if (veh) {
                      form.setValue('car_number', veh.plate_number);
                      form.setValue('car_model', veh.model);
                    }
                  }}
                  disabled={!orgId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mashina tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleList.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate_number} — {v.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Mashina raqami</Label>
                <Input {...form.register('car_number')} placeholder="30A123BB" />
                {form.formState.errors.car_number && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.car_number.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Mashina modeli (ixtiyoriy)</Label>
                <Input {...form.register('car_model')} placeholder="Chevrolet Lacetti" />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Xizmatlar</Label>
            <div className="max-h-40 overflow-y-auto rounded-md border border-[var(--border)] p-2 space-y-2">
              {serviceList.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded px-2 py-1 hover:bg-muted/50"
                >
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.includes(s.id)}
                      onChange={(e) => {
                        const ids = e.target.checked
                          ? [...selectedServiceIds, s.id]
                          : selectedServiceIds.filter((id) => id !== s.id);
                        form.setValue('service_ids', ids);
                      }}
                      className="rounded"
                    />
                    <span>{s.name}</span>
                  </label>
                  <span className="text-sm text-muted-foreground">
                    {Number(s.price).toLocaleString('uz-UZ')} so&apos;m
                  </span>
                </div>
              ))}
            </div>
            {form.formState.errors.service_ids && (
              <p className="text-sm text-destructive">
                {form.formState.errors.service_ids.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Usta</Label>
            <Select
              value={form.watch('master_id')}
              onValueChange={(v) => form.setValue('master_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ustani tanlang" />
              </SelectTrigger>
              <SelectContent>
                {masterList.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.fullname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.master_id && (
              <p className="text-sm text-destructive">
                {form.formState.errors.master_id.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="delivery"
              checked={form.watch('delivery_needed')}
              onChange={(e) => form.setValue('delivery_needed', e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="delivery">Yetkazib berish kerak</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Bekor
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Yaratilmoqda…' : 'Yaratish'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
