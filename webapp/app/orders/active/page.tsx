"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTelegram } from "@/hooks/useTelegram";
import { isTelegramWebApp } from "@/utils/telegram-env";
import { TelegramRequired } from "@/components/TelegramRequired";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { SkeletonCard } from "@/components/Skeleton";
import { fetchMyOrders, type MyOrder } from "@/utils/api";

const DELIVERY_FEE = 30_000;

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

function firstItemLabel(order: MyOrder): string {
  const first = order.orderItems?.[0];
  if (!first) return "—";
  return first.service?.name ?? first.product?.name ?? first.item_name ?? "—";
}

export default function OrdersActivePage() {
  const { isReady, user: telegramUser } = useTelegram();
  const telegramId = telegramUser?.id ?? null;
  const [data, setData] = useState<{ items: MyOrder[]; total: number }>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (telegramId == null) return;
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetchMyOrders(telegramId, { status: "active", limit: 50 });
      setData({ items: res.items ?? [], total: res.total ?? 0 });
    } catch (e) {
      setData({ items: [], total: 0 });
      setError(e instanceof Error ? e.message : "Yuklanmadi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [telegramId]);

  useEffect(() => {
    if (!isReady) return;
    load();
  }, [isReady, load]);

  if (!isTelegramWebApp()) {
    return <TelegramRequired />;
  }

  if (loading && data.items.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <PageHeader title="📋 Faol buyurtmalar" backHref="/" />
        <div className="p-4 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <PageHeader
        title="📋 Faol buyurtmalar"
        backHref="/"
        right={
          <span className="rounded-full bg-[var(--primary)] text-[var(--primary-on)] text-xs font-semibold px-2 py-0.5 min-w-[1.25rem] text-center">
            {data.total}
          </span>
        }
      />

      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <Link
            href="/orders/history"
            className="text-sm font-medium text-[var(--text-2)]"
          >
            📜 Tarix
          </Link>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => load(true)}
            className="text-sm font-medium text-[var(--primary)] disabled:opacity-50"
          >
            {refreshing ? "Yuklanmoqda..." : "Yangilash"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-[var(--danger)]/50 bg-[var(--danger)]/10 px-4 py-2 text-sm text-[var(--danger)]">
            {error}
            <button type="button" onClick={() => load()} className="ml-2 underline">
              Qayta urinish
            </button>
          </div>
        )}

        {!error && data.items.length === 0 && (
          <div className="card-webapp py-12 text-center text-[var(--text-2)]">
            <p className="text-4xl mb-2">📭</p>
            <p className="font-medium">Hozircha buyurtma yo&apos;q</p>
          </div>
        )}

        {!error && data.items.length > 0 && (
          <ul className="space-y-4">
            {data.items.map((order) => (
              <li key={order.id} className="card-webapp">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm font-medium text-[var(--text)]">
                    🔧 {firstItemLabel(order)}
                  </span>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-xs text-[var(--text-2)] font-mono">#{order.id.slice(0, 8)}</p>
                <p className="text-sm text-[var(--text-2)]">👤 {order.client_name}</p>
                <p className="text-sm text-[var(--text-2)]">
                  🚗 {order.car_number}
                  {order.car_model ? ` — ${order.car_model}` : ""}
                </p>
                <ul className="text-sm text-[var(--text-2)] mt-1 space-y-0.5">
                  {order.orderItems?.slice(0, 3).map((i) => (
                    <li key={i.id}>
                      {i.service?.name ?? i.product?.name ?? i.item_name ?? "—"}
                      {i.quantity > 1 ? ` × ${i.quantity}` : ""}
                    </li>
                  ))}
                  {(order.orderItems?.length ?? 0) > 3 && (
                    <li className="opacity-80">...</li>
                  )}
                </ul>
                <p className="text-sm font-medium text-[var(--text)] mt-1">
                  💰 {formatPrice(calcTotal(order))}
                </p>
                <p className="text-xs text-[var(--text-2)]">🕐 {formatDate(order.created_at)}</p>
                <Link
                  href={`/orders/${order.id}`}
                  className="btn-primary mt-3 !h-10 text-sm"
                >
                  Ko&apos;rish
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
