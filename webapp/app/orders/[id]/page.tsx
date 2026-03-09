"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";
import { isTelegramWebApp } from "@/utils/telegram-env";
import { TelegramRequired } from "@/components/TelegramRequired";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchOrder, type MyOrder } from "@/utils/api";

const DELIVERY_FEE = 30_000;

function formatPrice(amount: number): string {
  return Number(amount).toLocaleString("uz-UZ") + " so'm";
}

function formatDate(created_at: string): string {
  try {
    const d = new Date(created_at);
    return d.toLocaleDateString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return created_at;
  }
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

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string | undefined;
  const { isReady } = useTelegram();
  const [order, setOrder] = useState<MyOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrder(orderId);
      setOrder(data);
    } catch (e) {
      setOrder(null);
      setError(e instanceof Error ? e.message : "Buyurtma topilmadi");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!isReady || !orderId) return;
    load();
  }, [isReady, orderId, load]);

  if (!isTelegramWebApp()) {
    return <TelegramRequired />;
  }

  if (loading && !order) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <PageHeader title="Buyurtma" backHref="/orders/active" />
        <div className="p-4">
          <div className="card-webapp py-8 text-center text-[var(--text-2)]">
            <p>{error ?? "Buyurtma topilmadi"}</p>
            <button
              type="button"
              onClick={() => router.push("/orders/active")}
              className="btn-primary mt-4 max-w-xs mx-auto"
            >
              Orqaga
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shortId = order.id.slice(0, 8);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <PageHeader title={`Buyurtma #${shortId}`} backHref="/orders/active" />

      <div className="p-4">
        <div className="card-webapp space-y-4">
          <div>
            <p className="text-xs text-[var(--text-2)] mb-0.5">Holat</p>
            <p className="font-medium text-[var(--text)]">
              {order.status === "completed" && "✅ Tugallandi"}
              {order.status === "cancelled" && "❌ Bekor qilindi"}
              {order.status !== "completed" && order.status !== "cancelled" && (
                <StatusBadge status={order.status} />
              )}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-[var(--text)]">👤 {order.client_name}</p>
            {order.client_phone && (
              <p className="text-sm text-[var(--text-2)]">📞 {order.client_phone}</p>
            )}
          </div>

          <div>
            <p className="text-sm text-[var(--text)]">
              🚗 {order.car_number}
              {order.car_model ? ` — ${order.car_model}` : ""}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-[var(--text-2)] mb-1">🔧 Xizmatlar</p>
            <ul className="space-y-0.5">
              {order.orderItems?.map((item) => (
                <li key={item.id} className="text-sm text-[var(--text)] flex justify-between gap-2">
                  <span>
                    {item.service?.name ?? item.product?.name ?? item.item_name ?? "—"}
                    {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                  </span>
                  <span className="text-[var(--text-2)] shrink-0">
                    {formatPrice(Number(item.price_at_time) * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-[var(--border)] pt-3">
            <p className="text-base font-semibold text-[var(--text)]">
              💰 Jami: {formatPrice(calcTotal(order))}
            </p>
            <p className="text-sm text-[var(--text-2)] mt-1">
              📅 {formatDate(order.created_at)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
