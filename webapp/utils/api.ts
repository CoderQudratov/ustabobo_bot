/**
 * Backend API client for AVTO-PRO WebApp (TZ §6).
 * Every request MUST send header "x-telegram-init-data" = Telegram.WebApp.initData.
 * Backend validates via HMAC; no initData -> do not call API, trigger onTelegramRequired.
 */
import { getInitDataOrNull, getStartParam } from "@/utils/telegram-env";

const INIT_DATA_HEADER = 'x-telegram-init-data';

/** Custom error when initData is missing — do not call backend. */
export const TELEGRAM_REQUIRED = "TELEGRAM_REQUIRED";

function getBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url && String(url).trim()) return String(url).trim().replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    return `http://localhost:${window.location.port === '3001' ? '3000' : window.location.port || '3000'}`;
  }
  return '';
}

/** Use to show "Iltimos, bot orqali kiring" when opened outside Telegram (initData missing). */
export function hasTelegramInitData(): boolean {
  const data = getInitDataOrNull();
  return typeof data === "string" && data.trim().length > 0;
}

/** Parse Telegram user id from initData for error reporting. Returns empty string if unavailable. */
export function getTelegramUserId(): string {
  const raw = getInitDataOrNull();
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
let onPinRequired: (() => void) | null = null;
let onTelegramRequired: (() => void) | null = null;

/** Set callback when 401 is received (e.g. show "Session Expired" modal). */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

/** Set callback when 403 PIN required is received — show "Botga qayting va PIN kiriting." */
export function setPinRequiredHandler(handler: (() => void) | null) {
  onPinRequired = handler;
}

/** Set callback when initData is missing — do not call backend, show Telegram required screen. */
export function setTelegramRequiredHandler(handler: (() => void) | null) {
  onTelegramRequired = handler;
}

/**
 * Centralized fetch wrapper. Always sends x-telegram-init-data (backend expects lowercase).
 * If initData is empty we do NOT call backend: trigger onTelegramRequired and throw TELEGRAM_REQUIRED.
 */
async function apiFetch(pathOrUrl: string, init: RequestInit = {}): Promise<Response> {
  const initData = getInitDataOrNull();
  if (!initData?.trim()) {
    if (onTelegramRequired) onTelegramRequired();
    throw new Error(TELEGRAM_REQUIRED);
  }
  if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
    const startParam = getStartParam();
    console.log("[WebApp] initData length:", initData.length, "start_param:", startParam ?? "(none)");
  }
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : getApiUrl(pathOrUrl);
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set(INIT_DATA_HEADER, initData);
  const res = await fetch(url, {
    mode: 'cors',
    credentials: 'include',
    ...init,
    headers,
  });
  if (res.status === 401 && onSessionExpired) {
    onSessionExpired();
  }
  if (res.status === 403 && onPinRequired) {
    onPinRequired();
  }
  return res;
}

/** Upload car photo (multipart). Returns { url } for the saved image. */
export async function uploadCarPhoto(file: File): Promise<{ url: string }> {
  const initData = getInitDataOrNull();
  if (!initData?.trim()) {
    if (onTelegramRequired) onTelegramRequired();
    throw new Error(TELEGRAM_REQUIRED);
  }
  const url = getApiUrl('api/upload');
  const formData = new FormData();
  formData.append('file', file);
  const headers = new Headers();
  headers.set(INIT_DATA_HEADER, initData);
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
  if (res.status === 403 && onPinRequired) {
    onPinRequired();
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
  /** For driver: open in Google Maps https://maps.google.com/?q=lat,lng */
  lat?: number | null;
  lng?: number | null;
}

/** Fetches current user's orders. telegramId from Telegram.WebApp (sent in URL per backend). */
export async function fetchMyOrders(telegramId: string | number): Promise<MyOrder[]> {
  const res = await apiFetch(`orders/my/${encodeURIComponent(String(telegramId))}`, {
    method: 'GET',
  });
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

/** POST /orders/:id/driver-delivered — Driver "Yetkazib berdim" (accepted/received_by_driver → delivered_by_driver). */
export async function driverDeliveredOrderApi(orderId: string): Promise<void> {
  const res = await apiFetch(`orders/${encodeURIComponent(orderId)}/driver-delivered`, {
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
