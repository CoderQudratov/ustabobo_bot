"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { isTelegramWebApp } from "@/utils/telegram-env";
import { TelegramRequired } from "@/components/TelegramRequired";

// ─── Types ───────────────────────────────────────────────────────────────────
interface OrderItem {
  id: string;
  item_name: string | null;
  quantity: number;
  price_at_time: number;
  item_type: "service" | "product" | "manual_product";
  product?: { name: string } | null;
  service?: { name: string } | null;
}

interface Order {
  id: string;
  status: string;
  delivery_needed: boolean;
  lat?: number | null;
  lng?: number | null;
  created_at: string;
  master?: { fullname: string; phone?: string } | null;
  driver?: { fullname: string } | null;
  orderItems: OrderItem[];
  total_amount?: number;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Qoralama",
  waiting_confirmation: "Tasdiqlash kutilmoqda",
  broadcasted: "Kuryerlar uchun",
  accepted: "Qabul qilindi",
  received_by_driver: "Qabul qilindi (kuryer)",
  waiting_master_delivery_confirmation: "Usta tasdiqlashi kutilmoqda",
  delivered_by_driver: "Yetkazildi",
  received_by_master: "Qabul qilindi (usta)",
  working: "Ish jarayonida",
  waiting_customer_confirmation: "Mijoz tasdiqlashi",
  completed: "Yakunlangan",
  cancelled: "Bekor qilindi",
};

const screenStyle: React.CSSProperties = {
  backgroundColor: "var(--tg-theme-bg-color, #0f172a)",
  color: "var(--tg-theme-text-color, #f9fafb)",
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function DriverOrderPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [checked, setChecked] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [delivering, setDelivering] = useState(false);
  const [delivered, setDelivered] = useState(false);

  // Build headers with Telegram initData for auth
  const buildHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) {
      headers["x-telegram-init-data"] = window.Telegram.WebApp.initData;
    }
    return headers;
  }, []);

  // Fetch order details
  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${apiUrl}/orders/${orderId}`, {
        headers: buildHeaders(),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      const data: Order = await res.json();
      setOrder(data);
      if (data.status === "delivered_by_driver" || data.status === "completed") {
        setDelivered(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, [orderId, buildHeaders]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setChecked(true);
  }, []);

  useEffect(() => {
    if (checked && orderId) {
      fetchOrder();
    }
  }, [checked, orderId, fetchOrder]);

  // Mark as delivered
  const handleDelivered = async () => {
    if (!orderId || delivering) return;
    try {
      setDelivering(true);
      setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${apiUrl}/orders/${orderId}/driver-delivered`, {
        method: "POST",
        headers: buildHeaders(),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      setDelivered(true);
      setTimeout(() => {
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
          window.Telegram.WebApp.close();
        }
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yetkazib berish tasdiqlashda xatolik");
    } finally {
      setDelivering(false);
    }
  };

  if (checked && !isTelegramWebApp()) {
    return <TelegramRequired />;
  }

  if (!checked || loading) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-6"
        style={screenStyle}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--tg-theme-button-color,#38bdf8)] border-t-transparent"
          aria-hidden
        />
        <p className="text-sm opacity-70">Buyurtma yuklanmoqda...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-6"
        style={screenStyle}
      >
        <p className="text-red-400 text-center">❌ {error}</p>
        <button
          onClick={fetchOrder}
          className="mt-2 rounded-xl bg-white/10 px-6 py-3 text-sm font-medium active:scale-95"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  if (delivered) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
        style={screenStyle}
      >
        <div className="text-6xl">✅</div>
        <h2 className="text-xl font-semibold">Yetkazib berildi!</h2>
        <p className="text-sm opacity-70">Buyurtma muvaffaqiyatli yetkazildi.</p>
      </div>
    );
  }

  if (!order) return null;

  const totalSum = order.orderItems.reduce(
    (sum, item) => sum + Number(item.price_at_time) * item.quantity,
    0,
  );

  const itemName = (item: OrderItem) =>
    item.item_name ?? item.product?.name ?? item.service?.name ?? "—";

  return (
    <div className="min-h-screen p-4" style={screenStyle}>
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wide opacity-50">Buyurtma</p>
        <h1 className="text-lg font-bold">#{order.id.slice(-8).toUpperCase()}</h1>
        <span className="mt-1 inline-block rounded-full bg-white/10 px-3 py-0.5 text-xs">
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      {order.master && (
        <div className="mb-3 rounded-2xl bg-white/5 p-3">
          <p className="text-xs opacity-50 mb-1">Usta</p>
          <p className="font-medium">{order.master.fullname}</p>
          {order.master.phone && (
            <a
              href={`tel:${order.master.phone}`}
              className="text-sm text-sky-400 underline"
            >
              📞 {order.master.phone}
            </a>
          )}
        </div>
      )}

      {order.lat != null && order.lng != null && (
        <div className="mb-3 rounded-2xl bg-white/5 p-3">
          <p className="text-xs opacity-50 mb-1">Manzil</p>
          <a
            href={`https://maps.google.com/?q=${order.lat},${order.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-sky-400 underline"
          >
            🗺️ Xaritada ko&apos;rish ({Number(order.lat).toFixed(4)}, {Number(order.lng).toFixed(4)})
          </a>
        </div>
      )}

      <div className="mb-3 rounded-2xl bg-white/5 p-3">
        <p className="text-xs opacity-50 mb-2">Buyurtma tarkibi</p>
        <ul className="space-y-1">
          {order.orderItems.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span>
                {item.item_type === "product" ? "📦" : item.item_type === "service" ? "🔧" : "📝"}{" "}
                {itemName(item)} ×{item.quantity}
              </span>
              <span className="opacity-70">
                {(Number(item.price_at_time) * item.quantity).toLocaleString("uz-UZ")} so&apos;m
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 border-t border-white/10 pt-2 flex justify-between text-sm font-semibold">
          <span>Jami</span>
          <span>{totalSum.toLocaleString("uz-UZ")} so&apos;m</span>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-red-500/20 p-3 text-sm text-red-300">
          ❌ {error}
        </div>
      )}

      {(order.status === "accepted" || order.status === "received_by_driver") && (
        <button
          onClick={handleDelivered}
          disabled={delivering}
          className="mt-4 w-full rounded-2xl bg-[var(--tg-theme-button-color,#2481cc)] py-4 text-[var(--tg-theme-button-text-color,#fff)] font-semibold text-base active:scale-95 disabled:opacity-50 transition-all"
        >
          {delivering ? "Yuklanmoqda..." : "✅ Yetkazib berdim"}
        </button>
      )}
    </div>
  );
}
