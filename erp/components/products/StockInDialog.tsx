'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiPatch, apiGet } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { toast } from 'sonner';
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

const schema = z.object({
  quantity: z.number().min(1, 'Miqdor 1 dan kam bo‘lmasligi kerak'),
  price_per_unit: z.number().min(0).optional(),
  supplier_id: z.string().uuid().optional().or(z.literal('')),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface SuppliersRes {
  items: { id: string; fullname: string }[];
}

interface StockInDialogProps {
  productId: string;
  productName: string;
  /** Mahsulotning taminotchisi — kirimda avtomatik tanlangan bo‘ladi */
  defaultSupplierId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StockInDialog({
  productId,
  productName,
  defaultSupplierId,
  onSuccess,
  onCancel,
}: StockInDialogProps) {
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => apiGet<SuppliersRes>('/admin/suppliers?page=1&limit=200'),
  });
  const suppliers = suppliersData?.items ?? [];

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      quantity: 1,
      price_per_unit: undefined,
      supplier_id: defaultSupplierId ?? '',
      note: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (d: FormData) =>
      apiPatch(`/admin/products/${productId}/stock-in`, {
        quantity: d.quantity,
        ...(d.price_per_unit != null &&
          d.price_per_unit > 0 && { price_per_unit: d.price_per_unit }),
        ...(d.supplier_id?.trim() && { supplier_id: d.supplier_id.trim() }),
        ...(d.note?.trim() && { note: d.note.trim() }),
      }),
    onSuccess,
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kirim qo‘shish — {productName}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
          className="space-y-4"
        >
          <div>
            <Label>Taminotchi (ixtiyoriy — qarz hisobga yoziladi)</Label>
            <Select
              value={form.watch('supplier_id') || 'none'}
              onValueChange={(v) =>
                form.setValue('supplier_id', v === 'none' ? '' : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Taminotchini tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tanlanmadi</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.fullname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Miqdor</Label>
            <Input
              type="number"
              min={1}
              {...form.register('quantity', { valueAsNumber: true })}
            />
            {form.formState.errors.quantity && (
              <p className="text-destructive text-sm">
                {form.formState.errors.quantity.message}
              </p>
            )}
          </div>
          <div>
            <Label>Narx (ixtiyoriy — agar narx o‘zgardi)</Label>
            <Input
              type="number"
              min={0}
              step={100}
              placeholder="Yangi kelgan narx"
              {...form.register('price_per_unit', { valueAsNumber: true })}
            />
          </div>
          <div>
            <Label>Izoh (ixtiyoriy)</Label>
            <Input {...form.register('note')} placeholder="Izoh" />
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
