"use client";

import Link from "next/link";
import { useTelegram } from "@/hooks/useTelegram";

export default function Home() {
  const { user } = useTelegram();

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.first_name ||
    "Usta";

  return (
    <div
      className="flex min-h-screen flex-col p-6 pb-24"
      style={{
        backgroundColor: "var(--tg-theme-bg-color, #1a1a1a)",
        color: "var(--tg-theme-text-color, #fff)",
      }}
    >
      <header className="mb-8 pt-2">
        <h1 className="text-xl font-semibold">
          Assalomu alaykum, {displayName} 👋
        </h1>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center">
        <Link
          href="/new-order"
          className="flex min-h-14 min-w-[280px] max-w-sm items-center justify-center gap-2 rounded-2xl px-6 py-4 text-center text-lg font-medium transition-opacity active:opacity-90"
          style={{
            backgroundColor: "var(--tg-theme-button-color, #2481cc)",
            color: "var(--tg-theme-button-text-color, #fff)",
          }}
        >
          ➕ Yangi buyurtma ochish
        </Link>
      </main>
    </div>
  );
}
