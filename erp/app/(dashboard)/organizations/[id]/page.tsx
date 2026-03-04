'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

type Org = {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  payment_type: string;
  balance_due: string;
  vehicles: { id: string; plate_number: string; model: string; is_active: boolean }[];
};

const vehicleSchema = z.object({ plate_number: z.string().min(1), model: z.string().min(1) });

export default function OrganizationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization', id],
    queryFn: () => apiGet<Org>(`/admin/organizations/${id}`),
    enabled: !!id,
  });

  if (!id) return null;

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" asChild>
          <Link href="/organizations">← Tashkilotlar</Link>
        </Button>
      </div>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : org ? (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{org.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>Kontakt: {org.contact_person}, {org.phone}</p>
              <p>To‘lov: {org.payment_type === 'corporate_debt' ? 'Korporativ qarz' : 'Naqd'}</p>
              <p>Qarz: {Number(org.balance_due).toLocaleString('uz-UZ')} so‘m</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Mashinalar</CardTitle>
              <Button onClick={() => setAddOpen(true)}>Mashina qo‘shish</Button>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {org.vehicles.map((v) => (
                  <li key={v.id} className="flex items-center justify-between rounded border p-2">
                    <span>{v.plate_number} — {v.model}</span>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/vehicle-history?vehicle_id=${v.id}`}>Tarix</Link>
                    </Button>
                  </li>
                ))}
                {org.vehicles.length === 0 && <li className="text-muted-foreground">Mashinalar yo‘q</li>}
              </ul>
            </CardContent>
          </Card>
          {addOpen && (
            <AddVehicleDialog
              orgId={id}
              onSuccess={() => {
                setAddOpen(false);
                queryClient.invalidateQueries({ queryKey: ['organization', id] });
                toast.success('Qo‘shildi');
              }}
              onCancel={() => setAddOpen(false)}
            />
          )}
        </>
      ) : (
        <p>Topilmadi</p>
      )}
    </div>
  );
}

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
    defaultValues: { plate_number: '', model: '' },
  });
  const mutation = useMutation({
    mutationFn: (d: z.infer<typeof vehicleSchema>) => apiPost(`/admin/organizations/${orgId}/vehicles`, d),
    onSuccess,
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mashina qo‘shish</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <Label>Raqam</Label>
            <Input {...form.register('plate_number')} />
            {form.formState.errors.plate_number && <p className="text-destructive text-sm">{form.formState.errors.plate_number.message}</p>}
          </div>
          <div>
            <Label>Model</Label>
            <Input {...form.register('model')} />
            {form.formState.errors.model && <p className="text-destructive text-sm">{form.formState.errors.model.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Bekor</Button>
            <Button type="submit" disabled={mutation.isPending}>Saqlash</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
