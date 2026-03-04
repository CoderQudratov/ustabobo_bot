'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { Order, OrderItem } from '@/lib/types';
import { orderStatusLabel } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function OrderDetail({
  orderId,
  open,
  onClose,
}: {
  orderId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => apiGet<Order>(`/admin/orders/${orderId}`),
    enabled: open && !!orderId,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buyurtma #{orderId.slice(0, 8)}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : order ? (
          <OrderDetailBody order={order} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function OrderDetailBody({ order }: { order: Order }) {
  const itemLabel = (i: OrderItem) => {
    if (i.item_type === 'service' && i.service) return i.service.name;
    if (i.item_type === 'product' && i.product) return i.product.name;
    return i.item_name ?? '—';
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 text-sm">
        <p><strong>Mijoz:</strong> {order.client_name}, {order.client_phone}</p>
        <p><strong>Mashina:</strong> {order.car_number} {order.car_model ? `, ${order.car_model}` : ''}</p>
        <p><strong>Usta:</strong> {order.master?.fullname ?? '—'}</p>
        {order.driver && (
          <p><strong>Haydovchi:</strong> {order.driver.fullname}</p>
        )}
        {order.organization && (
          <p><strong>Tashkilot:</strong> {order.organization.name}</p>
        )}
        <p>
          <strong>Status:</strong>{' '}
          <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
            {orderStatusLabel(order.status)}
          </Badge>
        </p>
        <p><strong>Jami:</strong> {Number(order.total_amount).toLocaleString('uz-UZ')} so‘m</p>
      </div>
      {order.car_photo_url && (
        <div className="h-48 w-full overflow-hidden rounded-md border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={order.car_photo_url} alt="Mashina" className="h-full w-full object-contain" />
        </div>
      )}
      <div>
        <h4 className="mb-2 font-medium">Buyurtma tarkibi</h4>
        <ul className="space-y-1 text-sm">
          {order.orderItems.map((i) => (
            <li key={i.id}>
              {itemLabel(i)} × {i.quantity} — {Number(i.price_at_time).toLocaleString('uz-UZ')} so‘m
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
