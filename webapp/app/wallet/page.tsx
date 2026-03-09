"use client";

import { useCallback, useEffect, useState } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { isTelegramWebApp } from "@/utils/telegram-env";
import { TelegramRequired } from "@/components/TelegramRequired";
import { PageHeader } from "@/components/PageHeader";
import { fetchWallet, type WalletTransaction } from "@/utils/api";

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
      <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-4 bg-[var(--bg)]">
        <p className="text-sm text-[var(--text-2)] text-center">
          Bu sahifa Telegram bot orqali ochiladi. Kuryer menyudan &quot;Hamyon&quot; ni bosing.
        </p>
        <a href="/" className="btn-primary max-w-xs">
          Bosh sahifa
        </a>
      </div>
    );
  }

  if (loading && transactions.length === 0 && error === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 bg-[var(--bg)]">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"
          aria-hidden
        />
        <p className="text-sm text-[var(--text-2)]">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <PageHeader title="💰 Hamyon" backHref="/" />

      <div className="p-4 space-y-6">
        {error && (
          <div className="rounded-xl border border-[var(--danger)]/50 bg-[var(--danger)]/10 px-4 py-2 text-sm text-[var(--danger)]">
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

        <div className="card-webapp p-6 text-center">
          <p className="text-sm text-[var(--text-2)] mb-1">Joriy balans</p>
          <p className="text-2xl font-bold text-[var(--text)]">{formatAmount(balance)}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-3">So‘nggi harakatlar</h2>
          {transactions.length === 0 ? (
            <div className="card-webapp px-6 py-8 text-center text-sm text-[var(--text-2)]">
              Hali harakatlar yo&apos;q
            </div>
          ) : (
            <ul className="space-y-3">
              {transactions.map((t) => (
                <li
                  key={t.id}
                  className="card-webapp px-4 py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text)]">{transactionTypeLabel(t.type)}</p>
                    <p className="text-xs text-[var(--text-2)] font-mono">#{t.order_id.slice(0, 8)} · {formatDate(t.created_at)}</p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--success)] shrink-0">
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
