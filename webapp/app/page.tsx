"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isTelegramWebApp } from "@/utils/telegram-env";
import { TelegramRequired } from "@/components/TelegramRequired";

const screenStyle: React.CSSProperties = {
  backgroundColor: "var(--tg-theme-bg-color, #0f172a)",
  color: "var(--tg-theme-text-color, #f9fafb)",
};

export default function HomeHub() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setChecked(true);
  }, []);

  if (!checked) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-6"
        style={screenStyle}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--tg-theme-button-color,#38bdf8)] border-t-transparent"
          aria-hidden
        />
        <p className="text-sm opacity-90">Yuklanmoqda...</p>
      </div>
    );
  }

  if (!isTelegramWebApp()) {
    return <TelegramRequired />;
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-6"
      style={screenStyle}
    >
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">
        AVTO-PRO — Usta paneli
      </h1>

      <div className="flex w-full max-w-md flex-col gap-4">
        <Link
          href="/new-order"
          className="group rounded-3xl border border-white/20 bg-white/10 px-6 py-5 shadow-xl backdrop-blur-md transition hover:bg-white/15 active:scale-[0.98]"
        >
          <div className="mb-1 text-sm font-semibold uppercase tracking-wide text-sky-300">
            Yangi buyurtma
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">
                ➕ Yangi buyurtma qo&apos;shish
              </div>
              <p className="mt-1 text-xs opacity-80">
                Mijoz ma&apos;lumotlari, xizmatlar va zapchastlarni to&apos;ldiring.
              </p>
            </div>
            <span className="text-2xl opacity-70 group-hover:opacity-100">›</span>
          </div>
        </Link>

        <Link
          href="/my-orders"
          className="group rounded-3xl border border-white/20 bg-slate-900/60 px-6 py-5 shadow-xl backdrop-blur-md transition hover:bg-slate-900/80 active:scale-[0.98]"
        >
          <div className="mb-1 text-sm font-semibold uppercase tracking-wide text-emerald-300">
            Buyurtmalar
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">
                📦 Mening buyurtmalarim
              </div>
              <p className="mt-1 text-xs opacity-80">
                Ochilgan buyurtmalar, statuslar va chek ko&apos;rinishi.
              </p>
            </div>
            <span className="text-2xl opacity-70 group-hover:opacity-100">›</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

