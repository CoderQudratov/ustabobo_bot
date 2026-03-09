'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiPatch } from '@/lib/api';
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

const schema = z.object({
  quantity: z.number().min(1, 'Miqdor 1 dan kam bo‘lmasligi kerak'),
  price_per_unit: z.number().min(0).optional(),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface StockInDialogProps {
  productId: string;
  productName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StockInDialog({
  productId,
  productName,
  onSuccess,
  onCancel,
}: StockInDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1, price_per_unit: undefined, note: '' },
  });

  const mutation = useMutation({
    mutationFn: (d: FormData) =>
      apiPatch(`/admin/products/${productId}/stock-in`, {
        quantity: d.quantity,
        ...(d.price_per_unit != null && d.price_per_unit > 0 && { price_per_unit: d.price_per_unit }),
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
