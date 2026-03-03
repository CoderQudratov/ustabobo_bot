"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTelegram } from "@/hooks/useTelegram";
import { isTelegramWebApp } from "@/utils/telegram-env";
import { TelegramRequired } from "@/components/TelegramRequired";
import { fetchWallet, type WalletTransaction } from "@/utils/api";

const screenStyle = {
  backgroundColor: "var(--tg-theme-bg-color, #1a1a1a)",
  color: "var(--tg-theme-text-color, #fff)",
};

const btnStyle = {
  backgroundColor: "var(--tg-theme-button-color, #2481cc)",
  color: "var(--tg-theme-button-text-color, #fff)",
};

function formatAmount(amount: number): string {
  return Number(amount).toLocaleString("uz-UZ") + " so'm";
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

function transactionTypeLabel(type: string): string {
  if (type === "delivery_fee") return "Yetkazib berish haqi";
  return type;
}

export default function WalletPage() {
  const { isReady, user: telegramUser } = useTelegram();
  const telegramId = telegramUser?.id ?? null;
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchWallet();
      setBalance(data.balance);
      setTransactions(data.transactions ?? []);
    } catch (e) {
      setBalance(0);
      setTransactions([]);
      setError(e instanceof Error ? e.message : "Hamyon yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isTelegramWebApp()) return;
    loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    if (isReady && telegramId == null) setLoading(false);
  }, [isReady, telegramId]);

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
          Bu sahifa Telegram bot orqali ochiladi. Kuryer menyudan &quot;Hamyon&quot; ni bosing.
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

  if (loading && transactions.length === 0 && error === null) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-6"
        style={screenStyle}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--tg-theme-button-color,#2481cc)] border-t-transparent"
          aria-hidden
        />
        <p className="text-sm opacity-90">Yuklanmoqda...</p>
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
        <h1 className="text-lg font-semibold">💰 Hamyon</h1>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
            <button
              type="button"
              onClick={() => loadWallet()}
              className="ml-2 underline focus:outline-none"
            >
              Qayta urinish
            </button>
          </div>
        )}

        <div
          className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center"
          style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #2b2b2b)" }}
        >
          <p className="text-sm opacity-80 mb-1">Joriy balans</p>
          <p className="text-2xl font-bold">{formatAmount(balance)}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-3">So‘nggi harakatlar</h2>
          {transactions.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center text-sm opacity-80">
              Hali harakatlar yo‘q
            </div>
          ) : (
            <ul className="space-y-3">
              {transactions.map((t) => (
                <li
                  key={t.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{transactionTypeLabel(t.type)}</p>
                    <p className="text-xs opacity-70 font-mono">#{t.order_id.slice(0, 8)} · {formatDate(t.created_at)}</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400 shrink-0">
                    +{formatAmount(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
