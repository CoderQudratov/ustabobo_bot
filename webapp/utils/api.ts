/**
 * Backend API client for AVTO-PRO WebApp (TZ §6).
 * Single source for API base: NEXT_PUBLIC_API_URL (no hardcoded localhost in production).
 * Every request sends X-Telegram-Init-Data; 401 triggers session-expired flow.
 */
function getBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url && String(url).trim()) return String(url).trim().replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    return `http://localhost:${window.location.port === '3001' ? '3000' : window.location.port || '3000'}`;
  }
  return '';
}

function getTelegramInitData(): string {
  if (typeof window === 'undefined') return '';
  return window.Telegram?.WebApp?.initData ?? '';
}

/** Use to show "Iltimos, bot orqali kiring" when opened outside Telegram (initData missing). */
export function hasTelegramInitData(): boolean {
  return !!getTelegramInitData()?.trim();
}

/** Parse Telegram user id from initData for error reporting. Returns empty string if unavailable. */
export function getTelegramUserId(): string {
  const raw = getTelegramInitData();
  if (!raw?.trim()) return '';
  try {
    const params = new URLSearchParams(raw);
    const userStr = params.get('user');
    if (!userStr) return '';
    const user = JSON.parse(decodeURIComponent(userStr)) as { id?: number };
    return user?.id != null ? String(user.id) : '';
  } catch {
    return '';
  }
}

export function getApiUrl(path: string): string {
  const base = getBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

let onSessionExpired: (() => void) | null = null;

/** Set callback when 401 is received (e.g. show "Session Expired" modal and re-trigger initData handshake). */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

/**
 * Centralized fetch wrapper. Always sends X-Telegram-Init-Data.
 * On 401, calls session-expired handler so UI can show modal and suggest reopening from Telegram.
 */
async function apiFetch(pathOrUrl: string, init: RequestInit = {}): Promise<Response> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : getApiUrl(pathOrUrl);
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Telegram-Init-Data', getTelegramInitData());
  const res = await fetch(url, {
    mode: 'cors',
    credentials: 'include',
    ...init,
    headers,
  });
  if (res.status === 401 && onSessionExpired) {
    onSessionExpired();
  }
  return res;
}

/** Upload car photo (multipart). Returns { url } for the saved image. */
export async function uploadCarPhoto(file: File): Promise<{ url: string }> {
  const url = getApiUrl('api/upload');
  const formData = new FormData();
  formData.append('file', file);
  const headers = new Headers();
  headers.set('X-Telegram-Init-Data', getTelegramInitData());
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    headers,
    mode: 'cors',
    credentials: 'include',
  });
  if (res.status === 401 && onSessionExpired) {
    onSessionExpired();
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `Upload failed: ${res.status}`);
  }
  return res.json();
}

export interface WebAppInitResponse {
  services: { id: string; name: string; price: number }[];
  products: { id: string; name: string; sale_price: number; stock_count: number }[];
  organizations: { id: string; name: string }[];
  vehicles: { id: string; org_id: string; plate_number: string; model: string | null }[];
}

export async function fetchWebAppInit(): Promise<WebAppInitResponse> {
  const res = await apiFetch('webapp/init', { method: 'GET' });
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
  const res = await apiFetch('orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

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

export interface MyOrderMaster {
  id: string;
  fullname: string;
  login: string;
}
export interface MyOrderDriver {
  id: string;
  fullname: string;
}
export interface MyOrder {
  id: string;
  master_id: string;
  client_name: string;
  client_phone: string;
  car_number: string;
  car_model: string | null;
  car_photo_url?: string | null;
  delivery_needed?: boolean;
  status: string;
  total_amount: number;
  created_at: string;
  orderItems: MyOrderItem[];
  master?: MyOrderMaster;
  driver?: MyOrderDriver | null;
}

export async function fetchMyOrders(telegramId: string | number): Promise<MyOrder[]> {
  const id = typeof telegramId === 'number' ? String(telegramId) : telegramId;
  const res = await apiFetch(`orders/my/${encodeURIComponent(id)}`, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function cancelOrderApi(orderId: string): Promise<void> {
  const res = await apiFetch(`orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
}

/** POST /orders/:id/finish — Master "Ishni yakunlash" (working → waiting_customer_confirmation). */
export async function finishOrderApi(orderId: string): Promise<{ deep_link: string }> {
  const res = await apiFetch(`orders/${encodeURIComponent(orderId)}/finish`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

/** POST /orders/:id/driver-finish — Driver "Yetkazib berdim" (received_by_driver → working). */
export async function driverFinishOrderApi(orderId: string): Promise<void> {
  const res = await apiFetch(`orders/${encodeURIComponent(orderId)}/driver-finish`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
}

/** POST /orders/:id/receive — usta "Qabul qildim" (delivered_by_driver → working). */
export async function receiveOrderApi(orderId: string): Promise<void> {
  const res = await apiFetch(`orders/${encodeURIComponent(orderId)}/receive`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
}

export interface WalletTransaction {
  id: string;
  order_id: string;
  amount: number;
  type: string;
  created_at: string;
}

export interface WalletResponse {
  balance: number;
  transactions: WalletTransaction[];
}

export async function fetchWallet(): Promise<WalletResponse> {
  const res = await apiFetch('wallet', { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}
