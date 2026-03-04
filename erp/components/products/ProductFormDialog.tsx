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

type Product = {
  id: string;
  name: string;
  cost_price: string;
  sale_price: string;
  stock_count: number;
  min_limit: number;
};

const schema = z.object({
  name: z.string().min(1, 'Nomi kiriting'),
  cost_price: z.number().positive(),
  sale_price: z.number().positive(),
  stock_count: z.number().min(0),
  min_limit: z.number().min(0),
});

type FormData = z.infer<typeof schema>;

export function ProductFormDialog({
  product,
  onSuccess,
  onCancel,
}: {
  product?: Product | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: product
      ? {
          name: product.name,
          cost_price: Number(product.cost_price),
          sale_price: Number(product.sale_price),
          stock_count: product.stock_count,
          min_limit: product.min_limit,
        }
      : { name: '', cost_price: 0, sale_price: 0, stock_count: 0, min_limit: 0 },
  });
  const isEdit = !!product;
  const createMu = useMutation({
    mutationFn: (d: FormData) => apiPost('/admin/products', d),
    onSuccess,
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMu = useMutation({
    mutationFn: (d: FormData) => apiPatch(`/admin/products/${product!.id}`, d),
    onSuccess,
    onError: (e: Error) => toast.error(e.message),
  });
  const pending = createMu.isPending || updateMu.isPending;
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Tahrirlash' : 'Yangi mahsulot'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((d) => (isEdit ? updateMu.mutate(d) : createMu.mutate(d)))} className="space-y-4">
          <div>
            <Label>Nomi</Label>
            <Input {...form.register('name')} />
            {form.formState.errors.name && <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>}
          </div>
          <div>
            <Label>Kelgan narx</Label>
            <Input type="number" {...form.register('cost_price', { valueAsNumber: true })} />
            {form.formState.errors.cost_price && <p className="text-destructive text-sm">{form.formState.errors.cost_price.message}</p>}
          </div>
          <div>
            <Label>Sotish narx</Label>
            <Input type="number" {...form.register('sale_price', { valueAsNumber: true })} />
            {form.formState.errors.sale_price && <p className="text-destructive text-sm">{form.formState.errors.sale_price.message}</p>}
          </div>
          <div>
            <Label>Qoldiq</Label>
            <Input type="number" {...form.register('stock_count', { valueAsNumber: true })} />
            {form.formState.errors.stock_count && <p className="text-destructive text-sm">{form.formState.errors.stock_count.message}</p>}
          </div>
          <div>
            <Label>Min limit</Label>
            <Input type="number" {...form.register('min_limit', { valueAsNumber: true })} />
            {form.formState.errors.min_limit && <p className="text-destructive text-sm">{form.formState.errors.min_limit.message}</p>}
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
