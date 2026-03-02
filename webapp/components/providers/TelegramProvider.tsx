"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { TelegramWebAppUser } from "@/types/telegram";

type TelegramContextValue = {
  isReady: boolean;
  isTelegram: boolean;
  user: TelegramWebAppUser | null;
  initData: string;
};

const TelegramContext = createContext<TelegramContextValue | null>(null);

function getTelegramUser(): TelegramWebAppUser | null {
  if (typeof window === "undefined") return null;
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
  return user ?? null;
}

function getInitData(): string {
  if (typeof window === "undefined") return "";
  return window.Telegram?.WebApp?.initData ?? "";
}

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramWebAppUser | null>(null);
  const [initData, setInitData] = useState("");

  const isTelegram = !!user;

  const init = useCallback(() => {
    const u = getTelegramUser();
    setUser(u);
    setInitData(getInitData());
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.Telegram?.WebApp) {
      init();
      return;
    }
    const t = setInterval(() => {
      if (window.Telegram?.WebApp) {
        clearInterval(t);
        init();
      }
    }, 50);
    return () => clearInterval(t);
  }, [init]);

  const value = useMemo<TelegramContextValue>(
    () => ({ isReady, isTelegram, user, initData }),
    [isReady, isTelegram, user, initData]
  );

  return (
    <TelegramContext.Provider value={value}>
      {!isReady ? (
        <div
          className="flex min-h-screen items-center justify-center p-6"
          style={{
            backgroundColor: "var(--tg-theme-bg-color, #1a1a1a)",
            color: "var(--tg-theme-text-color, #fff)",
          }}
        >
          <p className="animate-pulse">Yuklanmoqda...</p>
        </div>
      ) : !isTelegram ? (
        <div
          className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center"
          style={{
            backgroundColor: "var(--tg-theme-bg-color, #1a1a1a)",
            color: "var(--tg-theme-text-color, #fff)",
          }}
        >
          <div
            className="max-w-sm rounded-2xl p-6 shadow-lg"
            style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #2b2b2b)" }}
          >
            <p className="text-lg font-medium">
              Iltimos, ilovani Telegram bot orqali oching.
            </p>
            <p className="mt-2 text-sm opacity-80">
              Usta ilovasi faqat Telegram ichida ishlaydi.
            </p>
          </div>
        </div>
      ) : (
        children
      )}
    </TelegramContext.Provider>
  );
}

export { TelegramContext };
