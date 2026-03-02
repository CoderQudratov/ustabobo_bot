"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTelegram } from "@/hooks/useTelegram";
import {
  fetchMyOrders,
  cancelOrderApi,
  finishOrderApi,
  type MyOrder,
} from "@/utils/api";

const screenStyle = {
  backgroundColor: "var(--tg-theme-bg-color, #1a1a1a)",
  color: "var(--tg-theme-text-color, #fff)",
};

const btnStyle = {
  backgroundColor: "var(--tg-theme-button-color, #2481cc)",
  color: "var(--tg-theme-button-text-color, #fff)",
};

const CANCELABLE_STATUSES = ["draft", "waiting_confirmation"];
const FINISHABLE_STATUSES = ["working"];
const DELIVERY_FEE = 30_000;

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

function calcTotal(order: MyOrder): number {
  const itemsTotal =
    order.orderItems?.reduce(
      (sum, i) => sum + Number(i.price_at_time) * i.quantity,
      0
    ) ?? 0;
  const delivery = order.delivery_needed ? DELIVERY_FEE : 0;
  return itemsTotal + delivery;
}

export default function MyOrdersPage() {
  const { isReady, user: telegramUser } = useTelegram();
  const telegramId = telegramUser?.id ?? null;
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

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

  useEffect(() => {
    if (isReady && telegramId == null) setLoading(false);
  }, [isReady, telegramId]);

  const handleCancel = async (orderId: string) => {
    setActioningId(orderId);
    try {
      await cancelOrderApi(orderId);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o))
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
      setActioningId(null);
    }
  };

  const handleFinishOrReceive = async (order: MyOrder) => {
    setActioningId(order.id);
    try {
      // TZ §10: Finish is allowed ONLY when status is working.
      if (order.status !== "working") {
        if (typeof window !== "undefined" && window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert(
            `Ishni yakunlash mumkin emas. Status: ${order.status}`
          );
        }
        return;
      }

        const { deep_link } = await finishOrderApi(order.id);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? { ...o, status: "waiting_customer_confirmation" }
              : o
          )
        );
        if (typeof window !== "undefined" && window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert(
            `Ish yakunlandi.\nTasdiqlash linki:\n${deep_link}`
          );
        }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Xato";
      if (typeof window !== "undefined" && window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(msg);
      }
    } finally {
      setActioningId(null);
    }
  };

  const canCancel = (status: string) => CANCELABLE_STATUSES.includes(status);
  const canFinishOrReceive = (status: string) => FINISHABLE_STATUSES.includes(status);
  const isCompleted = (status: string) => status === "completed";

  if (telegramId == null && !loading) {
    return (
      <div
        className="min-h-screen p-6 flex flex-col items-center justify-center gap-4"
        style={screenStyle}
      >
        <p className="text-sm opacity-80 text-center">
          Bu sahifa Telegram bot orqali ochiladi. Bot menyudan &quot;Mening
          buyurtmalarim&quot; ni bosing.
        </p>
        <Link
          href="/"
          className="rounded-xl px-4 py-2 text-sm font-medium"
          style={btnStyle}
        >
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
        <p className="text-sm opacity-90">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={screenStyle}>
      <div className="sticky top-0 z-20 flex items-center gap-4 bg-[color:var(--tg-theme-bg-color,#1a1a1a)]/95 px-6 py-4 backdrop-blur">
        <Link
          href="/"
          className="rounded-xl px-3 py-2 text-sm font-medium"
          style={btnStyle}
        >
          ⬅️ Orqaga
        </Link>
        <h1 className="text-lg font-semibold">Mening buyurtmalarim</h1>
      </div>

      <div className="p-6">
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
          <div className="rounded-xl border border:white/10 bg-white/5 px-6 py-10 text-center text-sm opacity-80">
            Buyurtmalar yo&apos;q
          </div>
        )}

        {!error && orders.length > 0 && (
          <ul className="space-y-4">
            {orders.map((order) => (
              <li
                key={order.id}
                className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-sm"
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
                      {formatDate(order.created_at)} ·{" "}
                      {formatPrice(calcTotal(order))}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg px-2 py-1 text-xs ${statusBadgeClass(
                      order.status
                    )}`}
                  >
                    {statusLabel(order.status)}
                  </span>
                  <span className="shrink-0 text-lg opacity-70">
                    {expandedId === order.id ? "−" : "+"}
                  </span>
                </button>

                {expandedId === order.id && (
                  <div className="border-t border-white/10 px-4 py-4 space-y-3">
                    <p className="text-xs opacity-70">
                      {order.client_name} · {order.car_number}
                      {order.car_model ? ` · ${order.car_model}` : ""}
                    </p>
                    <ul className="text-sm space-y-1.5">
                      {order.orderItems?.map((item) => (
                        <li
                          key={item.id}
                          className="flex justify-between gap-2 text-left"
                        >
                          <span>
                            {item.service?.name ??
                              item.product?.name ??
                              item.item_name ??
                              "—"}
                            {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                          </span>
                          <span className="text-white/80 shrink-0">
                            {formatPrice(
                              Number(item.price_at_time) * item.quantity
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm font-semibold pt-2 border-t border-white/10">
                      Jami: {formatPrice(calcTotal(order))}
                    </p>

                    {canCancel(order.status) && (
                      <button
                        type="button"
                        disabled={actioningId === order.id}
                        className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/40 disabled:opacity-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancel(order.id);
                        }}
                      >
                        {actioningId === order.id ? "..." : "🗑 Bekor qilish"}
                      </button>
                    )}

                    {canFinishOrReceive(order.status) && (
                      <button
                        type="button"
                        disabled={actioningId === order.id}
                        className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/40 disabled:opacity-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFinishOrReceive(order);
                        }}
                      >
                        {actioningId === order.id
                          ? "..."
                          : "🏁 Ishni yakunlash"}
                      </button>
                    )}

                    {isCompleted(order.status) && (
                      <p className="mt-2 text-sm text-emerald-400 font-medium">
                        ✅ Yakunlangan
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

