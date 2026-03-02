"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTelegram } from "@/hooks/useTelegram";
import { fetchMyOrders, cancelOrderApi, type MyOrder } from "@/utils/api";

const screenStyle = {
  backgroundColor: "var(--tg-theme-bg-color, #1a1a1a)",
  color: "var(--tg-theme-text-color, #fff)",
};

const btnStyle = {
  backgroundColor: "var(--tg-theme-button-color, #2481cc)",
  color: "var(--tg-theme-button-text-color, #fff)",
};

const CANCELABLE_STATUSES = ["draft", "waiting_confirmation"];

function statusBadgeClass(status: string): string {
  switch (status) {
    case "draft":
    case "waiting_confirmation":
      return "bg-amber-500/20 text-amber-400 border border-amber-500/40";
    case "broadcasted":
    case "accepted":
    case "delivered_by_driver":
    case "received_by_master":
    case "working":
    case "waiting_customer_confirmation":
      return "bg-blue-500/20 text-blue-400 border border-blue-500/40";
    case "completed":
      return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40";
    case "cancelled":
      return "bg-red-500/20 text-red-400 border border-red-500/40";
    default:
      return "bg-white/10 text-white/80 border border-white/20";
  }
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Qoralama",
    waiting_confirmation: "Tasdiqlash kutilmoqda",
    broadcasted: "Kuryerlar uchun",
    accepted: "Qabul qilindi",
    delivered_by_driver: "Yetkazildi",
    received_by_master: "Qabul qilindi (usta)",
    working: "Ish jarayonida",
    waiting_customer_confirmation: "Mijoz tasdiqlashi",
    completed: "Yakunlangan",
    cancelled: "Bekor qilindi",
  };
  return labels[status] ?? status;
}

function formatDate(created_at: string): string {
  try {
    const d = new Date(created_at);
    return d.toLocaleDateString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return created_at;
  }
}

function formatPrice(amount: number): string {
  return Number(amount).toLocaleString("uz-UZ") + " so'm";
}

export default function MyOrdersPage() {
  const { isReady, user: telegramUser } = useTelegram();
  const telegramId = telegramUser?.id ?? null;
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (telegramId == null) return;
    setError(null);
    setLoading(true);
    try {
      const data = await fetchMyOrders(telegramId);
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setOrders([]);
      setError(e instanceof Error ? e.message : "Buyurtmalar yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [telegramId]);

  useEffect(() => {
    if (telegramId == null) return;
    loadOrders();
  }, [telegramId, loadOrders]);

  // When in Telegram but no user (e.g. test mode), stop loading so we show "open from bot" message
  useEffect(() => {
    if (isReady && telegramId == null) setLoading(false);
  }, [isReady, telegramId]);

  const handleCancel = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      await cancelOrderApi(orderId);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: "cancelled" } : o
        )
      );
      if (typeof window !== "undefined" && window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert("Buyurtma bekor qilindi!");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bekor qilish xato";
      if (typeof window !== "undefined" && window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(msg);
      }
    } finally {
      setCancellingId(null);
    }
  };

  const canCancel = (status: string) =>
    CANCELABLE_STATUSES.includes(status);

  if (telegramId == null && !loading) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-4" style={screenStyle}>
        <p className="text-sm opacity-80 text-center">
          Bu sahifa Telegram bot orqali ochiladi. Bot menyudan &quot;Mening buyurtmalarim&quot; ni bosing.
        </p>
        <Link href="/" className="rounded-xl px-4 py-2 text-sm font-medium" style={btnStyle}>
          Bosh sahifa
        </Link>
      </div>
    );
  }

  if (loading && orders.length === 0) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-6"
        style={screenStyle}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--tg-theme-button-color,#2481cc)] border-t-transparent"
          aria-hidden
        />
        <p className="text-sm opacity-90">Buyurtmalar yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-24" style={screenStyle}>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/"
          className="rounded-xl px-3 py-2 text-sm font-medium"
          style={btnStyle}
        >
          ← Orqaga
        </Link>
        <h1 className="text-lg font-semibold">Mening buyurtmalarim</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
          <button
            type="button"
            onClick={() => telegramId != null && loadOrders()}
            className="ml-2 underline focus:outline-none"
          >
            Qayta urinish
          </button>
        </div>
      )}

      {!error && orders.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm opacity-80">
          Sizda hali buyurtmalar yo&apos;q
        </div>
      )}

      {!error && orders.length > 0 && (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
            >
              <button
                type="button"
                className="w-full px-4 py-3 text-left flex items-center justify-between gap-2"
                onClick={() =>
                  setExpandedId((id) => (id === order.id ? null : order.id))
                }
              >
                <div className="min-w-0">
                  <p className="text-xs opacity-70 font-mono truncate">
                    #{order.id.slice(0, 8)}
                  </p>
                  <p className="text-sm font-medium">
                    {formatDate(order.created_at)} · {formatPrice(Number(order.total_amount))}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-lg px-2 py-1 text-xs ${statusBadgeClass(order.status)}`}
                >
                  {statusLabel(order.status)}
                </span>
                <span className="shrink-0 text-lg opacity-70">
                  {expandedId === order.id ? "−" : "+"}
                </span>
              </button>

              {expandedId === order.id && (
                <div className="border-t border-white/10 px-4 py-3 space-y-2">
                  <p className="text-xs opacity-70">
                    {order.client_name} · {order.car_number}
                  </p>
                  <ul className="text-sm space-y-1">
                    {order.orderItems?.map((item) => (
                      <li key={item.id} className="flex justify-between gap-2">
                        <span>
                          {item.service?.name ??
                            item.product?.name ??
                            item.item_name ??
                            "—"}
                          {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                        </span>
                        <span className="text-white/80">
                          {formatPrice(Number(item.price_at_time) * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm font-medium pt-1 border-t border-white/10">
                    Jami: {formatPrice(Number(order.total_amount))}
                  </p>
                  {canCancel(order.status) && (
                    <button
                      type="button"
                      disabled={cancellingId === order.id}
                      className="mt-2 w-full rounded-xl py-2 text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/40 disabled:opacity-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancel(order.id);
                      }}
                    >
                      {cancellingId === order.id ? "..." : "❌ Bekor qilish"}
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
