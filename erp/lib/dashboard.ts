/** Oxirgi buyurtma (dashboard recent_orders) */
export interface RecentOrderItem {
  id: string;
  client_name: string;
  service_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

/** Dashboard API response (GET /admin/dashboard) */
export interface DashboardRes {
  today_orders: number;
  today_revenue: number;
  active_orders: number;
  low_stock_count: number;
  recent_orders: RecentOrderItem[];
}

/** One day in weekly orders (GET /admin/dashboard/weekly-orders) */
export interface WeeklyOrderItem {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface WeeklyOrdersRes {
  items: WeeklyOrderItem[];
}

/** One day in weekly revenue (GET /admin/dashboard/weekly-revenue) */
export interface WeeklyRevenueItem {
  date: string; // YYYY-MM-DD
  revenue: number;
}

export interface WeeklyRevenueRes {
  items: WeeklyRevenueItem[];
}

/** Order status count for PieChart (GET /admin/dashboard/order-status-counts) */
export interface OrderStatusCountItem {
  status: string; // e.g. pending | in_progress | completed | cancelled
  count: number;
}

export interface OrderStatusCountsRes {
  items: OrderStatusCountItem[];
}

/**
 * Format sum in so'm: 1_000_000 → "1 mln so'm", 500_000 → "500 ming so'm"
 */
export function formatSom(value: number): string {
  if (value >= 1_000_000) {
    const mln = value / 1_000_000;
    return mln % 1 === 0
      ? `${mln} mln so'm`
      : `${mln.toFixed(1)} mln so'm`;
  }
  if (value >= 1_000) {
    const ming = value / 1_000;
    return ming % 1 === 0
      ? `${ming} ming so'm`
      : `${ming.toFixed(1)} ming so'm`;
  }
  return `${value.toLocaleString('uz-UZ')} so'm`;
}
