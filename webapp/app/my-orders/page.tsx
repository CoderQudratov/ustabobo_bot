"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";
import { isTelegramWebApp } from "@/utils/telegram-env";
import { TelegramRequired } from "@/components/TelegramRequired";
import {
  fetchMyOrders,
  cancelOrderApi,
  finishOrderApi,
  driverFinishOrderApi,
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
const MASTER_FINISH_STATUS = "working";
const DRIVER_FINISH_STATUS = "received_by_driver";
const DELIVERY_FEE = 30_000;

function statusBadgeClass(status: string): string {
  switch (status) {
    case "draft":
    case "waiting_confirmation":
      return "bg-amber-500/20 text-amber-400 border border-amber-500/40";
    case "broadcasted":
    case "accepted":
    case "received_by_driver":
    case "waiting_master_delivery_confirmation":
    case "waiting_master_work_start":
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
    received_by_driver: "Qabul qilindi (kuryer)",
    waiting_master_delivery_confirmation: "Usta tasdiqlashi kutilmoqda",
    waiting_master_work_start: "Ishni boshlash kutilmoqda",
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
  const searchParams = useSearchParams();
  const role = (searchParams.get("role") ?? "master").toLowerCase();
  const filter = (searchParams.get("filter") ?? "").toLowerCase(); // 'active' | 'history' for driver
  const isDriver = role === "driver";
  const { isReady, user: telegramUser } = useTelegram();
  const telegramId = telegramUser?.id ?? null;
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [confirmFinishOrderId, setConfirmFinishOrderId] = useState<string | null>(null);
  const [carPhotoModalUrl, setCarPhotoModalUrl] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    const tgId = telegramUser?.id;
    if (tgId == null) {
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await fetchMyOrders(tgId);
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setOrders([]);
      setError(e instanceof Error ? e.message : "Buyurtmalar yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [telegramUser?.id]);

  useEffect(() => {
    if (!isReady) return;
    loadOrders();
  }, [isReady, loadOrders]);

  // TZ §8.3, §9.1 — Auto-open and scroll to order when ?open=ORDER_ID in URL.
  // Bot sends inline WebApp button with this URL after masterStartWork / masterConfirmDelivery.
  useEffect(() => {
    if (orders.length === 0) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const openId = params.get("open");
    if (!openId) return;

    setExpandedId((prev) => {
      if (prev === openId) return prev;
      return openId;
    });

    const timer = setTimeout(() => {
      const el = document.getElementById(`order-${openId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [orders]);

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

  const handleMasterFinishClick = (order: MyOrder) => {
    if (order.status !== MASTER_FINISH_STATUS) {
      if (typeof window !== "undefined" && window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(
          `Ishni yakunlash mumkin emas. Status: ${order.status}`
        );
      }
      return;
    }
    setConfirmFinishOrderId(order.id);
  };

  const handleMasterFinishConfirm = async () => {
    const orderId = confirmFinishOrderId;
    setConfirmFinishOrderId(null);
    if (!orderId) return;
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.status !== MASTER_FINISH_STATUS) return;
    setActioningId(orderId);
    try {
      await finishOrderApi(orderId);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "waiting_customer_confirmation" }
            : o
        )
      );
      if (typeof window !== "undefined" && window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(
          "Ish yakunlandi. Tasdiqlash linki chatga yuborildi."
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

  const handleDriverFinish = async (order: MyOrder) => {
    setActioningId(order.id);
    try {
      if (order.status !== DRIVER_FINISH_STATUS) {
        if (typeof window !== "undefined" && window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert(
            `Yetkazib berishni belgilash mumkin emas. Status: ${order.status}`
          );
        }
        return;
      }
      await driverFinishOrderApi(order.id);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, status: "waiting_master_delivery_confirmation" }
            : o
        )
      );
      if (typeof window !== "undefined" && window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(
          "Ustaga yuborildi. Usta tasdiqlagach ish davom etadi."
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
  const canMasterFinish = (status: string) => status === MASTER_FINISH_STATUS;
  const canDriverFinish = (status: string) => status === DRIVER_FINISH_STATUS;
  const isCompleted = (status: string) => status === "completed";

  const DRIVER_ACTIVE_STATUSES = ["received_by_driver", "waiting_master_delivery_confirmation"];
  const DRIVER_HISTORY_STATUSES = ["working", "completed"];
  const filteredOrders =
    isDriver && filter === "active"
      ? orders.filter((o) => DRIVER_ACTIVE_STATUSES.includes(o.status))
      : isDriver && filter === "history"
        ? orders.filter((o) => DRIVER_HISTORY_STATUSES.includes(o.status))
        : orders;

  if (!isTelegramWebApp()) {
    return <TelegramRequired />;
  }

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
      {carPhotoModalUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setCarPhotoModalUrl(null)}
          role="dialog"
          aria-label="Mashina rasm"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-lg bg-white/20 px-3 py-1 text-sm text-white"
            onClick={() => setCarPhotoModalUrl(null)}
          >
            Yopish
          </button>
          <img
            src={carPhotoModalUrl}
            alt="Mashina rasm"
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {confirmFinishOrderId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div
            className="max-w-sm rounded-2xl p-6 shadow-xl w-full"
            style={{
              backgroundColor: "var(--tg-theme-secondary-bg-color, #2b2b2b)",
              color: "var(--tg-theme-text-color, #fff)",
            }}
          >
            <p className="text-lg font-medium">Buyurtmani yakunlashni tasdiqlaysizmi?</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-xl py-2.5 text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/40"
                onClick={() => setConfirmFinishOrderId(null)}
              >
                Bekor qilish
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
                style={btnStyle}
                onClick={handleMasterFinishConfirm}
              >
                Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="sticky top-0 z-20 flex flex-col gap-2 bg-[color:var(--tg-theme-bg-color,#1a1a1a)]/95 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="rounded-xl px-3 py-2 text-sm font-medium"
            style={btnStyle}
          >
            ⬅️ Orqaga
          </Link>
          <h1 className="text-lg font-semibold">Mening buyurtmalarim</h1>
        </div>
        {isDriver && (
          <div className="flex gap-2">
            <Link
              href={`/my-orders?role=driver&filter=active`}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                filter === "active"
                  ? "bg-[var(--tg-theme-button-color,#2481cc)] text-[var(--tg-theme-button-text-color,#fff)]"
                  : "bg-white/10 text-white/80"
              }`}
            >
              📦 Faol
            </Link>
            <Link
              href={`/my-orders?role=driver&filter=history`}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                filter === "history"
                  ? "bg-[var(--tg-theme-button-color,#2481cc)] text-[var(--tg-theme-button-text-color,#fff)]"
                  : "bg-white/10 text-white/80"
              }`}
            >
              🕒 Tarix
            </Link>
          </div>
        )}
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
            <button
              type="button"
              onClick={() => loadOrders()}
              className="ml-2 underline focus:outline-none"
            >
              Qayta urinish
            </button>
          </div>
        )}

        {!error && orders.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm opacity-80">
            Buyurtmalar yo&apos;q
          </div>
        )}

        {!error && orders.length > 0 && filteredOrders.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm opacity-80">
            {isDriver && filter === "active"
              ? "Faol buyurtmalar yo\u2018q"
              : isDriver && filter === "history"
                ? "Tarix bo\u2018yicha buyurtmalar yo\u2018q"
                : "Buyurtmalar yo\u2018q"}
          </div>
        )}

        {!error && orders.length > 0 && filteredOrders.length > 0 && (
          <ul className="space-y-4">
            {filteredOrders.map((order) => (
              <li
                key={order.id}
                id={`order-${order.id}`}
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
                    {!isDriver && order.car_photo_url && (
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCarPhotoModalUrl(order.car_photo_url ?? null);
                          }}
                          className="shrink-0 overflow-hidden rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-[var(--tg-theme-button-color)]"
                        >
                          <img
                            src={order.car_photo_url}
                            alt="Mashina rasm"
                            className="h-16 w-24 object-cover"
                          />
                        </button>
                        <span className="text-xs opacity-70">Mashina rasm (bosib kattalashtirish)</span>
                      </div>
                    )}
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

                    {/* Driver: one-tap open in Google Maps (TZ Phase 7) */}
                    {isDriver && order.lat != null && order.lng != null && (
                      <a
                        href={`https://maps.google.com/?q=${Number(order.lat)},${Number(order.lng)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-sm font-medium border border-white/20 bg-white/10 hover:bg-white/15"
                        style={{ color: "var(--tg-theme-link-color, #2481cc)" }}
                      >
                        🗺️ Xaritada ochish
                      </a>
                    )}

                    {order.master && (
                      <p className="text-xs opacity-80 pt-1">
                        Usta: {order.master.fullname}
                        {order.master.login ? ` (@${order.master.login})` : ""}
                      </p>
                    )}
                    {order.client_phone && (
                      <a
                        href={`tel:${order.client_phone.replace(/\s/g, "")}`}
                        className="text-sm font-medium"
                        style={{ color: "var(--tg-theme-link-color, #2481cc)" }}
                      >
                        📞 {order.client_phone}
                      </a>
                    )}

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

                    {isDriver && canDriverFinish(order.status) && (
                      <button
                        type="button"
                        disabled={actioningId === order.id}
                        className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
                        style={btnStyle}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDriverFinish(order);
                        }}
                      >
                        {actioningId === order.id
                          ? "..."
                          : "🏁 Yetkazib berdim / Yakunlash"}
                      </button>
                    )}
                    {!isDriver && order.status === "waiting_master_delivery_confirmation" && (
                      <p className="mt-2 text-sm text-amber-400 font-medium">
                        ⏳ Kuryerdan qabul qilish kutilmoqda
                      </p>
                    )}
                    {!isDriver && canMasterFinish(order.status) && (
                      <button
                        type="button"
                        disabled={actioningId === order.id}
                        className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/40 disabled:opacity-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMasterFinishClick(order);
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

