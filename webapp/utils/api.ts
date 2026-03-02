/**
 * Backend API — NEXT_PUBLIC_API_URL orqali ulash (masalan https://avtoproapi.loca.lt).
 * Trailing slash olib tashlanadi. O'rnatilmasa: http://localhost:3000.
 */
const getBaseUrl = (): string => {
  const url = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_URL : undefined;
  if (url) return String(url).replace(/\/$/, "");
  return "http://localhost:3000";
};

export function getApiUrl(path: string): string {
  const base = getBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

const defaultFetchOptions: RequestInit = {
  mode: "cors",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
};

export interface WebAppInitResponse {
  services: { id: string; name: string; price: number }[];
  products: { id: string; name: string; sale_price: number; stock_count: number }[];
  organizations: { id: string; name: string }[];
  vehicles: { id: string; org_id: string; plate_number: string; model: string | null }[];
}

export async function fetchWebAppInit(initData: string): Promise<WebAppInitResponse> {
  const url = getApiUrl("webapp/init");
  const res = await fetch(url, {
    ...defaultFetchOptions,
    method: "GET",
    headers: {
      ...defaultFetchOptions.headers,
      "X-Telegram-Init-Data": initData,
    } as HeadersInit,
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

/** TZ 6.2.7 — Backend POST /orders uchun payload */
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

export async function createOrder(
  payload: CreateOrderPayload,
  initData: string
): Promise<{ id: string }> {
  const url = getApiUrl("orders");
  const res = await fetch(url, {
    ...defaultFetchOptions,
    method: "POST",
    headers: {
      ...defaultFetchOptions.headers,
      "X-Telegram-Init-Data": initData,
    } as HeadersInit,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}
