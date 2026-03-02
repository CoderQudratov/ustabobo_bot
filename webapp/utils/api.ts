/**
 * Backend API — NEXT_PUBLIC_API_URL orqali ulash
 */

const getBaseUrl = (): string => {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  return "http://localhost:3001";
};

export function getApiUrl(path: string): string {
  const base = getBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export interface WebAppInitResponse {
  services: { id: string; name: string; price: number }[];
  products: { id: string; name: string; sale_price: number; stock_count: number }[];
  organizations: { id: string; name: string }[];
  vehicles: { id: string; org_id: string; plate_number: string; model: string | null }[];
}

export async function fetchWebAppInit(initData: string): Promise<WebAppInitResponse> {
  const res = await fetch(getApiUrl("webapp/init"), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
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

export async function createOrder(
  payload: CreateOrderPayload,
  initData: string
): Promise<{ id: string }> {
  const res = await fetch(getApiUrl("orders"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}
