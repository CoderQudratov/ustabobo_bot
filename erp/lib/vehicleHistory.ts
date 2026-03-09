import type { OrderStatus } from './types';

export interface VehicleHistoryOrderItem {
  id: string;
  item_type: string;
  item_name?: string | null;
  quantity: number;
  product?: { name: string } | null;
  service?: { name: string } | null;
}

export interface VehicleHistoryOrder {
  id: string;
  created_at: string;
  completed_at: string | null;
  status: OrderStatus;
  total_amount: string;
  master?: { fullname: string } | null;
  orderItems: VehicleHistoryOrderItem[];
}

export interface VehicleHistoryStats {
  total_services: number;
  total_spent: number;
  last_service_date: string | null;
  most_used_service: string | null;
}

export interface VehicleHistoryRes {
  vehicle: {
    id: string;
    plate_number: string;
    model: string;
    organization: string | null;
  };
  stats: VehicleHistoryStats;
  orders: VehicleHistoryOrder[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface VehicleByPlateRes {
  id: string;
  plate_number: string;
  model: string;
  organization: { name: string } | null;
}
