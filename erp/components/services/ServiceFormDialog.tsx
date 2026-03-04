'use client';

import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiPost, apiPatch } from '@/lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Service = { id: string; name: string; price: string };
const schema = z.object({ name: z.string().min(1), price: z.number().positive() });
type FormData = z.infer<typeof schema>;

export function ServiceFormDialog({
  service,
  onSuccess,
  onCancel,
}: {
  service?: Service | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: service ? { name: service.name, price: Number(service.price) } : { name: '', price: 0 },
  });
  const createMu = useMutation({
    mutationFn: (d: z.infer<typeof schema>) => apiPost('/admin/services', d),
    onSuccess,
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMu = useMutation({
    mutationFn: (d: z.infer<typeof schema>) => apiPatch(`/admin/services/${service!.id}`, d),
    onSuccess,
    onError: (e: Error) => toast.error(e.message),
  });
  const isEdit = !!service;
  const pending = createMu.isPending || updateMu.isPending;
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Tahrirlash' : 'Yangi xizmat'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((d) => (isEdit ? updateMu.mutate(d) : createMu.mutate(d)))} className="space-y-4">
          <div>
            <Label>Nomi</Label>
            <Input {...form.register('name')} />
            {form.formState.errors.name && <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>}
          </div>
          <div>
            <Label>Narxi</Label>
            <Input type="number" {...form.register('price', { valueAsNumber: true })} />
            {form.formState.errors.price && <p className="text-destructive text-sm">{form.formState.errors.price.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Bekor</Button>
            <Button type="submit" disabled={pending}>Saqlash</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
