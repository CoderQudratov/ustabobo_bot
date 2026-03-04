export type OrderStatus =
  | 'draft'
  | 'waiting_confirmation'
  | 'waiting_master_work_start'
  | 'broadcasted'
  | 'accepted'
  | 'received_by_driver'
  | 'waiting_master_delivery_confirmation'
  | 'delivered_by_driver'
  | 'received_by_master'
  | 'working'
  | 'waiting_customer_confirmation'
  | 'completed'
  | 'cancelled';

export type OrderItemType = 'product' | 'service' | 'manual_product';

export interface OrderItem {
  id: string;
  item_type: OrderItemType;
  product_id: string | null;
  service_id: string | null;
  item_name: string | null;
  quantity: number;
  price_at_time: string;
  product?: { id: string; name: string } | null;
  service?: { id: string; name: string } | null;
}

export interface Order {
  id: string;
  master_id: string;
  driver_id: string | null;
  organization_id: string | null;
  vehicle_id: string | null;
  client_name: string;
  client_phone: string;
  car_number: string;
  car_model: string | null;
  car_photo_url: string | null;
  delivery_needed: boolean;
  status: OrderStatus;
  total_amount: string;
  created_at: string;
  completed_at: string | null;
  master: { id: string; fullname: string; phone: string; username: string | null };
  driver?: { id: string; fullname: string; phone: string; username: string | null } | null;
  organization?: { id: string; name: string; balance_due: string } | null;
  vehicle?: { id: string; plate_number: string; model: string } | null;
  orderItems: OrderItem[];
}

export interface OrdersListRes {
  items: Order[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Qoralama',
  waiting_confirmation: 'Tasdiq kutilmoqda',
  waiting_master_work_start: 'Usta boshlashi kutilmoqda',
  broadcasted: 'E\'lon qilindi',
  accepted: 'Qabul qilindi',
  received_by_driver: 'Haydovchi oldi',
  waiting_master_delivery_confirmation: 'Yetkazilishi kutilmoqda',
  delivered_by_driver: 'Yetkazildi',
  received_by_master: 'Usta qabul qildi',
  working: 'Ishlanyapti',
  waiting_customer_confirmation: 'Mijoz tasdiqi kutilmoqda',
  completed: 'Tugallandi',
  cancelled: 'Bekor qilindi',
};

export function orderStatusLabel(s: OrderStatus): string {
  return STATUS_LABELS[s] ?? s;
}
