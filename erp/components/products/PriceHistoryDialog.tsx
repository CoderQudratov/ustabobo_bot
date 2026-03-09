'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface PriceHistoryItem {
  id: string;
  cost_price: number;
  sale_price: number;
  created_at: string;
  changed_by: { id: string; fullname: string } | null;
  note: string | null;
}

interface PriceHistoryRes {
  items: PriceHistoryItem[];
}

interface PriceHistoryDialogProps {
  productId: string;
  productName: string;
  onCancel: () => void;
}

export function PriceHistoryDialog({
  productId,
  productName,
  onCancel,
}: PriceHistoryDialogProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['product', productId, 'price-history'],
    queryFn: () =>
      apiGet<PriceHistoryRes>(`/admin/products/${productId}/price-history`),
    enabled: !!productId,
  });

  const items = data?.items ?? [];

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Narx tarixi — {productName}</DialogTitle>
        </DialogHeader>
        {isLoading && <Skeleton className="h-48 w-full" />}
        {isError && (
          <p className="text-destructive text-sm">
            {error instanceof Error ? error.message : 'Yuklanmadi'}
          </p>
        )}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            {items.length === 0 ? (
              <p className="text-muted-foreground py-4">
                Narx o‘zgarishlari yo‘q
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Sana</th>
                    <th className="p-3 text-right font-medium">Kelgan narx</th>
                    <th className="p-3 text-right font-medium">Sotish narx</th>
                    <th className="p-3 text-left font-medium">Kim o‘zgartirdi</th>
                    <th className="p-3 text-left font-medium">Izoh</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((h) => (
                    <tr key={h.id} className="border-b">
                      <td className="p-3">
                        {new Date(h.created_at).toLocaleString('uz-UZ', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="p-3 text-right">
                        {Number(h.cost_price).toLocaleString('uz-UZ')} so‘m
                      </td>
                      <td className="p-3 text-right">
                        {Number(h.sale_price).toLocaleString('uz-UZ')} so‘m
                      </td>
                      <td className="p-3">
                        {h.changed_by?.fullname ?? '—'}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {h.note ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
