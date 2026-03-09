/**
 * Backend API client for AVTO-PRO WebApp (TZ §6).
 * Auth: WebApp login token (8h) or x-telegram-init-data. Every request sends Authorization: Bearer when token present.
 */
import { getInitDataOrNull, getStartParam } from "@/utils/telegram-env";

const INIT_DATA_HEADER = 'x-telegram-init-data';
const WEBAPP_TOKEN_KEY = 'webapp_token';
const WEBAPP_USER_KEY = 'webapp_user';
const WEBAPP_LOGIN_AT_KEY = 'webapp_login_at';
const WEBAPP_TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

export function getWebappToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(WEBAPP_TOKEN_KEY);
}

export function getWebappUser(): { id: string; fullname: string; login: string; role: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(WEBAPP_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setWebappAuth(token: string, user: { id: string; fullname: string; login: string; role: string }): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WEBAPP_TOKEN_KEY, token);
  localStorage.setItem(WEBAPP_USER_KEY, JSON.stringify(user));
  localStorage.setItem(WEBAPP_LOGIN_AT_KEY, String(Date.now()));
}

export function clearWebappAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WEBAPP_TOKEN_KEY);
  localStorage.removeItem(WEBAPP_USER_KEY);
  localStorage.removeItem(WEBAPP_LOGIN_AT_KEY);
}

export function isWebappTokenValid(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem(WEBAPP_TOKEN_KEY);
  const loginAt = localStorage.getItem(WEBAPP_LOGIN_AT_KEY);
  if (!token || !loginAt) return false;
  const at = parseInt(loginAt, 10);
  if (!Number.isFinite(at) || Date.now() - at > WEBAPP_TOKEN_TTL_MS) return false;
  return true;
}

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

/** Parse API error body and return user-friendly message (O'zbek). */
export function parseApiError(text: string, status: number): string {
  try {
    const j = JSON.parse(text);
    if (j?.error?.message && typeof j.error.message === 'string') return j.error.message;
  } catch {
    // ignore
  }
  if (status === 401) return "Tizimga kiring";
  if (status === 403) return "Ruxsat yo'q. Tizimga qayta kiring.";
  if (status === 404) return "Topilmadi.";
  return text && text.length < 200 ? text : "Xato yuz berdi. Qayta urinib ko'ring.";
}

let onSessionExpired: (() => void) | null = null;
let onTelegramRequired: (() => void) | null = null;

/** Set callback when 401 is received (e.g. show "Session Expired" modal). */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

/** Set callback when initData is missing — do not call backend, show Telegram required screen. */
export function setTelegramRequiredHandler(handler: (() => void) | null) {
  onTelegramRequired = handler;
}

/**
 * Centralized fetch wrapper. Sends Authorization: Bearer when webapp token valid; optionally x-telegram-init-data.
 * If no valid token and no initData, trigger onTelegramRequired and throw.
 */
async function apiFetch(pathOrUrl: string, init: RequestInit = {}): Promise<Response> {
  const token = getWebappToken();
  const validToken = token && isWebappTokenValid();
  const initData = getInitDataOrNull();
  if (!validToken && !initData?.trim()) {
    if (onTelegramRequired) onTelegramRequired();
    throw new Error(TELEGRAM_REQUIRED);
  }
  if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
    const startParam = getStartParam();
    console.log("[WebApp] token:", !!validToken, "initData:", !!initData?.trim(), "start_param:", startParam ?? "(none)");
  }
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : getApiUrl(pathOrUrl);
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (validToken && token) headers.set('Authorization', `Bearer ${token}`);
  if (initData?.trim()) headers.set(INIT_DATA_HEADER, initData);
  const res = await fetch(url, {
    mode: 'cors',
    credentials: 'include',
    ...init,
    headers,
  });
  if (res.status === 401) {
    clearWebappAuth();
    if (onSessionExpired) onSessionExpired();
  }
  return res;
}

/** WebApp login (no initData required). Returns { token, user }. */
export async function webappLoginApi(
  login: string,
  password: string,
): Promise<{ token: string; user: { id: string; fullname: string; login: string; role: string } }> {
  const url = getApiUrl('webapp/auth/login');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
    mode: 'cors',
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(parseApiError(text || '', res.status));
  }
  return res.json();
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
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(parseApiError(text || '', res.status));
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
    throw new Error(parseApiError(text || '', res.status));
  }
  return res.json();
}

export type WebAppServiceItem = { id: string; name: string; price: number };
export type WebAppProductItem = { id: string; name: string; sale_price: number; stock_count: number };

/** GET webapp/services?search=&limit=5 or ?sortBy=usage&limit=3 */
export async function fetchWebappServices(opts: {
  search?: string;
  limit?: number;
  sortBy?: 'usage';
}): Promise<WebAppServiceItem[]> {
  const params = new URLSearchParams();
  if (opts.search != null && opts.search !== '') params.set('search', opts.search);
  params.set('limit', String(opts.limit ?? 5));
  if (opts.sortBy === 'usage') params.set('sortBy', 'usage');
  const res = await apiFetch(`webapp/services?${params.toString()}`, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data?.items) ? data.items : [];
}

/** GET webapp/products?search=&limit=5 or ?sortBy=usage&limit=3 */
export async function fetchWebappProducts(opts: {
  search?: string;
  limit?: number;
  sortBy?: 'usage';
}): Promise<WebAppProductItem[]> {
  const params = new URLSearchParams();
  if (opts.search != null && opts.search !== '') params.set('search', opts.search);
  params.set('limit', String(opts.limit ?? 5));
  if (opts.sortBy === 'usage') params.set('sortBy', 'usage');
  const res = await apiFetch(`webapp/products?${params.toString()}`, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data?.items) ? data.items : [];
}

export type WebAppVehicleItem = {
  id: string;
  org_id: string;
  plate_number: string;
  model: string;
  year?: number;
  color?: string;
};

/** GET webapp/organizations/:orgId/vehicles */
export async function fetchWebappOrgVehicles(orgId: string): Promise<WebAppVehicleItem[]> {
  const res = await apiFetch(`webapp/organizations/${encodeURIComponent(orgId)}/vehicles`, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data?.items) ? data.items : [];
}

/** POST webapp/organizations/:orgId/vehicles — "Yangi mashina qo'sh" */
export async function createWebappVehicle(
  orgId: string,
  dto: { plate_number: string; model: string; year?: number; color?: string },
): Promise<WebAppVehicleItem> {
  const res = await apiFetch(`webapp/organizations/${encodeURIComponent(orgId)}/vehicles`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(parseApiError(text || '', res.status));
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
    throw new Error(parseApiError(text || '', res.status));
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

export interface MyOrdersResponse {
  items: MyOrder[];
  total: number;
  page: number;
  limit: number;
}

/** Fetches current user's orders (uses auth; no telegramId in URL). status=active|completed|cancelled|history, page, limit. */
export async function fetchMyOrders(
  _telegramIdOptional: string | number | null,
  opts?: { status?: string; page?: number; limit?: number },
): Promise<MyOrdersResponse> {
  const params = new URLSearchParams();
  if (opts?.status) params.set('status', opts.status);
  if (opts?.page != null) params.set('page', String(opts.page));
  if (opts?.limit != null) params.set('limit', String(opts.limit));
  const qs = params.toString();
  const url = `orders/my${qs ? `?${qs}` : ''}`;
  const res = await apiFetch(url, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(parseApiError(text || '', res.status));
  }
  const data = await res.json();
  return Array.isArray(data) ? { items: data, total: data.length, page: 1, limit: data.length } : data;
}

/** Single order by ID (for detail page). */
export async function fetchOrder(orderId: string): Promise<MyOrder> {
  const res = await apiFetch(`orders/${encodeURIComponent(orderId)}`, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(parseApiError(text || '', res.status));
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
    throw new Error(parseApiError(text || '', res.status));
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
    throw new Error(parseApiError(text || '', res.status));
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
    throw new Error(parseApiError(text || '', res.status));
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
    throw new Error(parseApiError(text || '', res.status));
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
    throw new Error(parseApiError(text || '', res.status));
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
    throw new Error(parseApiError(text || '', res.status));
  }
  return res.json();
}
