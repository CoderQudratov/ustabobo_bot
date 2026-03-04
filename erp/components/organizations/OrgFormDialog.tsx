'use client';

import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiPost } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const schema = z.object({
  name: z.string().min(1),
  contact_person: z.string().min(1),
  phone: z.string().min(1),
  payment_type: z.enum(['cash', 'corporate_debt']),
  balance_due: z.number().min(0),
});

type FormData = z.infer<typeof schema>;

export function OrgFormDialog({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { name: '', contact_person: '', phone: '', payment_type: 'cash', balance_due: 0 },
  });
  const mutation = useMutation({
    mutationFn: (d: FormData) => apiPost('/admin/organizations', d),
    onSuccess,
    onError: (e: Error) => form.setError('root', { message: e.message }),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Yangi tashkilot</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div><Label>Nomi</Label><Input {...form.register('name')} /></div>
          <div><Label>Kontakt</Label><Input {...form.register('contact_person')} /></div>
          <div><Label>Telefon</Label><Input {...form.register('phone')} /></div>
          <div>
            <Label>To‘lov turi</Label>
            <Select value={form.watch('payment_type')} onValueChange={(v) => form.setValue('payment_type', v as 'cash' | 'corporate_debt')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Naqd</SelectItem>
                <SelectItem value="corporate_debt">Korporativ qarz</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Qarz (ixtiyoriy)</Label><Input type="number" {...form.register('balance_due', { valueAsNumber: true })} /></div>
          {form.formState.errors.root && <p className="text-destructive text-sm">{form.formState.errors.root.message}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Bekor</Button>
            <Button type="submit" disabled={mutation.isPending}>Saqlash</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
