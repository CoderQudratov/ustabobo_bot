"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isTelegramWebApp } from "@/utils/telegram-env";
import { TelegramRequired } from "@/components/TelegramRequired";
import { LoginScreen } from "@/components/LoginScreen";
import { isWebappTokenValid } from "@/utils/api";

export default function HomeHub() {
  const [checked, setChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setChecked(true);
    const hasToken = isWebappTokenValid();
    const fromTelegram = isTelegramWebApp();
    setAuthenticated(fromTelegram || hasToken);
  }, []);

  if (!checked) {
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

  if (!isTelegramWebApp()) {
    return <TelegramRequired />;
  }

  if (!authenticated) {
    return <LoginScreen onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4">
        <h1 className="text-xl font-semibold text-[var(--text)]">
          AVTO-PRO — Usta paneli
        </h1>
      </header>
      <div className="flex w-full max-w-md mx-auto flex-col gap-4 p-4">
        <Link
          href="/new-order"
          className="card-webapp group block text-left active:scale-[0.99]"
        >
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
            Yangi buyurtma
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-base font-semibold text-[var(--text)]">
                ➕ Yangi buyurtma qo&apos;shish
              </div>
              <p className="mt-1 text-sm text-[var(--text-2)]">
                Mijoz ma&apos;lumotlari, xizmatlar va zapchastlarni to&apos;ldiring.
              </p>
            </div>
            <span className="text-xl text-[var(--text-2)] group-hover:text-[var(--text)]">›</span>
          </div>
        </Link>

        <Link
          href="/orders/active"
          className="card-webapp group block text-left active:scale-[0.99]"
        >
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--success)]">
            Buyurtmalar
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-base font-semibold text-[var(--text)]">
                📋 Mening buyurtmalarim
              </div>
              <p className="mt-1 text-sm text-[var(--text-2)]">
                Ochilgan buyurtmalar, statuslar va chek ko&apos;rinishi.
              </p>
            </div>
            <span className="text-xl text-[var(--text-2)] group-hover:text-[var(--text)]">›</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

