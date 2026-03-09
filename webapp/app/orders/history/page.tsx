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
const PAGE_SIZE = 20;

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

type Tab = "all" | "completed" | "cancelled";

export default function OrdersHistoryPage() {
  const { isReady, user: telegramUser } = useTelegram();
  const telegramId = telegramUser?.id ?? null;
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<MyOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusParam = tab === "all" ? "history" : tab === "completed" ? "completed" : "cancelled";

  const load = useCallback(
    async (pageNum: number, append: boolean) => {
      if (telegramId == null) return;
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      if (!append) setError(null);
      try {
        const res = await fetchMyOrders(telegramId, {
          status: statusParam,
          page: pageNum,
          limit: PAGE_SIZE,
        });
        const list = res.items ?? [];
        if (append) {
          setItems((prev) => (pageNum === 1 ? list : [...prev, ...list]));
        } else {
          setItems(list);
        }
        setTotal(res.total ?? 0);
        setPage(pageNum);
      } catch (e) {
        if (!append) {
          setItems([]);
          setError(e instanceof Error ? e.message : "Yuklanmadi");
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [telegramId, statusParam]
  );

  useEffect(() => {
    if (!isReady || !telegramId) return;
    setItems([]);
    load(1, false);
  }, [isReady, telegramId, statusParam, load]);

  const loadMore = useCallback(() => {
    if (loadingMore || items.length >= total) return;
    load(page + 1, true);
  }, [load, loadingMore, page, items.length, total]);

  if (!isTelegramWebApp()) {
    return <TelegramRequired />;
  }

  if (loading && items.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <PageHeader title="📜 Buyurtmalar tarixi" backHref="/" />
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
      <PageHeader title="📜 Buyurtmalar tarixi" backHref="/" />

      <div className="p-4">
        <div className="flex gap-2 mb-4 border-b border-[var(--border)] pb-2">
          {(["all", "completed", "cancelled"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                tab === t
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--border)]/50 text-[var(--text-2)]"
              }`}
            >
              {t === "all" ? "Hammasi" : t === "completed" ? "Tugallangan" : "Bekor"}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-[var(--danger)]/50 bg-[var(--danger)]/10 px-4 py-2 text-sm text-[var(--danger)]">
            {error}
            <button type="button" onClick={() => load(1, false)} className="ml-2 underline">
              Qayta urinish
            </button>
          </div>
        )}

        {!error && items.length === 0 && (
          <div className="card-webapp py-12 text-center text-[var(--text-2)]">
            <p className="text-4xl mb-2">📭</p>
            <p className="font-medium">Hozircha buyurtma yo&apos;q</p>
          </div>
        )}

        {!error && items.length > 0 && (
          <>
            <ul className="space-y-4">
              {items.map((order) => (
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
            {items.length < total && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={loadMore}
                  className="btn-ghost max-w-xs"
                >
                  {loadingMore ? "Yuklanmoqda..." : "Ko'proq yuklash"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
