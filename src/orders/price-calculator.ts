/**
 * Shared order total calculation. TZ: Total = Services + (Products×Qty) + (Manual×Qty) + (Delivery ? 30000 : 0).
 * Used by orders.service, bot, and must be mirrored in frontend (my-orders).
 */
export const DELIVERY_FEE = 30_000;

export interface OrderItemForTotal {
  item_type: string;
  price_at_time: number;
  quantity: number;
}

export function calculateOrderTotal(
  orderItems: OrderItemForTotal[],
  deliveryNeeded: boolean,
): number {
  const itemsTotal = (orderItems ?? []).reduce(
    (sum, item) => sum + Number(item.price_at_time) * item.quantity,
    0,
  );
  return itemsTotal + (deliveryNeeded ? DELIVERY_FEE : 0);
}
