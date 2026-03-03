/**
 * Order status state machine. TZ §4.1 — only allowed transitions are permitted.
 */
import { OrderStatus } from '../../generated/prisma/client';

const ALLOWED_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.draft]: [
    OrderStatus.waiting_confirmation,
    OrderStatus.broadcasted,
    OrderStatus.working,
    OrderStatus.waiting_master_work_start,
    OrderStatus.cancelled,
  ],
  [OrderStatus.waiting_confirmation]: [
    OrderStatus.broadcasted,
    OrderStatus.working,
    OrderStatus.waiting_master_work_start,
    OrderStatus.cancelled,
  ],
  [OrderStatus.waiting_master_work_start]: [OrderStatus.working],
  [OrderStatus.broadcasted]: [OrderStatus.received_by_driver],
  [OrderStatus.received_by_driver]: [
    OrderStatus.waiting_master_delivery_confirmation,
  ],
  [OrderStatus.waiting_master_delivery_confirmation]: [
    OrderStatus.working,
    OrderStatus.received_by_driver,
  ],
  [OrderStatus.accepted]: [OrderStatus.delivered_by_driver],
  [OrderStatus.delivered_by_driver]: [
    OrderStatus.received_by_master,
    OrderStatus.working,
  ],
  [OrderStatus.received_by_master]: [OrderStatus.working],
  [OrderStatus.working]: [OrderStatus.waiting_customer_confirmation],
  [OrderStatus.waiting_customer_confirmation]: [OrderStatus.completed],
  [OrderStatus.completed]: [],
  [OrderStatus.cancelled]: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function assertTransition(
  from: OrderStatus,
  to: OrderStatus,
  actionLabel: string,
): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `${actionLabel}: illegal transition from ${from} to ${to}. Allowed from ${from}: ${(ALLOWED_TRANSITIONS[from] ?? []).join(', ') || 'none'}.`,
    );
  }
}
