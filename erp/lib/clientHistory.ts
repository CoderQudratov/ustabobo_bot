/** Individual mijoz (clients/individuals list) */
export interface Client {
  client_phone: string;
  client_name: string;
  total_orders: number;
  total_spent: number;
  last_activity: string;
}

/** Mijoz buyurtmasi (detail) */
export interface ClientOrder {
  id: string;
  created_at: string;
  completed_at: string | null;
  status: string;
  total_amount: number;
  car_number: string;
  car_model: string | null;
  service_name: string;
}

export interface ClientsListRes {
  items: Client[];
  total: number;
  page: number;
  limit: number;
}

export interface ClientDetailRes {
  client: {
    client_phone: string;
    client_name: string;
    total_orders: number;
    total_spent: number;
  };
  orders: ClientOrder[];
}
