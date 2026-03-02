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
  },
};

function buildHeaders(initData?: string): HeadersInit {
  const data = initData ?? getTelegramInitData();
  return {
    ...defaultFetchOptions.headers,
    'X-Telegram-Init-Data': data,
  } as HeadersInit;
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
