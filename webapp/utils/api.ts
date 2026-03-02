/**
 * Backend API client. Uses NEXT_PUBLIC_API_URL (Cloudflare Tunnel / local); every request sends X-Telegram-Init-Data.
 */
const FALLBACK_BASE_URL = 'http://localhost:3000';

function getBaseUrl(): string {
  const url = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined;
  if (url && String(url).trim()) return String(url).replace(/\/$/, '');
  return FALLBACK_BASE_URL;
}

/**
 * Reads Telegram WebApp initData from the current window. Must be called in browser.
 * Attached to every API request as X-Telegram-Init-Data.
 */
function getTelegramInitData(): string {
  if (typeof window === 'undefined') return '';
  return window.Telegram?.WebApp?.initData ?? '';
}

export function getApiUrl(path: string): string {
  const base = getBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

const defaultFetchOptions: RequestInit = {
  mode: 'cors',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
    'ngrok-skip-browser-warning': 'true',
  },
};

/**
 * Builds request headers. Always includes X-Telegram-Init-Data when available
 * (window.Telegram.WebApp.initData when opened from Telegram). Call at request time.
 */
function buildHeaders(initDataOverride?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
    'ngrok-skip-browser-warning': 'true',
  };

  const initData =
    initDataOverride ??
    (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData
      ? window.Telegram.WebApp.initData
      : '');
  if (initData) {
    headers['X-Telegram-Init-Data'] = initData;
  }

  return headers as HeadersInit;
}

export interface WebAppInitResponse {
  services: { id: string; name: string; price: number }[];
  products: { id: string; name: string; sale_price: number; stock_count: number }[];
  organizations: { id: string; name: string }[];
  vehicles: { id: string; org_id: string; plate_number: string; model: string | null }[];
}

export async function fetchWebAppInit(): Promise<WebAppInitResponse> {
  const url = getApiUrl('webapp/init');
  const res = await fetch(url, {
    ...defaultFetchOptions,
    method: 'GET',
    headers: buildHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface CreateOrderProductItem {
  product_id: string;
  quantity: number;
}

export interface CreateOrderManualProductItem {
  name: string;
  price: number;
  quantity: number;
}

/** TZ 6.2.7 — Backend POST /orders payload */
export interface CreateOrderPayload {
  client_name: string;
  client_phone: string;
  car_number: string;
  car_model?: string;
  car_photo_url?: string;
  organization_id?: string;
  vehicle_id?: string;
  delivery_needed: boolean;
  service_ids?: string[];
  products?: CreateOrderProductItem[];
  manual_products?: CreateOrderManualProductItem[];
}

export async function createOrder(payload: CreateOrderPayload): Promise<{ id: string }> {
  const url = getApiUrl('orders');
  const res = await fetch(url, {
    ...defaultFetchOptions,
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Order item with product/service (TZ OrderItem + relations) */
export interface MyOrderItem {
  id: string;
  order_id: string;
  item_type: string;
  product_id: string | null;
  service_id: string | null;
  item_name: string | null;
  quantity: number;
  price_at_time: number;
  product: { id: string; name: string } | null;
  service: { id: string; name: string } | null;
}

/** Order for "My Orders" list (TZ Order + items) */
export interface MyOrder {
  id: string;
  master_id: string;
  client_name: string;
  client_phone: string;
  car_number: string;
  car_model: string | null;
  status: string;
  total_amount: number;
  created_at: string;
  orderItems: MyOrderItem[];
}

export async function fetchMyOrders(telegramId: string | number): Promise<MyOrder[]> {
  const id = typeof telegramId === 'number' ? String(telegramId) : telegramId;
  const url = getApiUrl(`orders/my/${encodeURIComponent(id)}`);
  const res = await fetch(url, {
    ...defaultFetchOptions,
    method: 'GET',
    headers: buildHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function cancelOrderApi(orderId: string): Promise<void> {
  const url = getApiUrl(`orders/${encodeURIComponent(orderId)}/cancel`);
  const res = await fetch(url, {
    ...defaultFetchOptions,
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
}
