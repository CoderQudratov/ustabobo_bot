"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import type { TelegramWebAppUser } from "@/types/telegram";

const SDK_WAIT_MS = 1800;

type TelegramContextValue = {
  isReady: boolean;
  isTelegram: boolean;
  isTestMode: boolean;
  user: TelegramWebAppUser | null;
  initData: string;
};

const TelegramContext = createContext<TelegramContextValue | null>(null);

function getWebApp() {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

function getTelegramUser(): TelegramWebAppUser | null {
  const webApp = getWebApp();
  return webApp?.initDataUnsafe?.user ?? null;
}

function getInitData(): string {
  const webApp = getWebApp();
  return webApp?.initData ?? "";
}

const screenBg = { backgroundColor: "var(--tg-theme-bg-color, #1a1a1a)" };
const screenFg = { color: "var(--tg-theme-text-color, #fff)" };
const secondaryBg = { backgroundColor: "var(--tg-theme-secondary-bg-color, #2b2b2b)" };

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramWebAppUser | null>(null);
  const [initData, setInitData] = useState("");
  const [hasTelegramEnv, setHasTelegramEnv] = useState(false);

  const isTelegram = hasTelegramEnv;
  const isTestMode = isTelegram && !user;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      const webApp = getWebApp();
      if (webApp) {
        webApp.ready();
        webApp.expand();
        if (typeof webApp.enableClosingConfirmation === "function") {
          webApp.enableClosingConfirmation();
        }
        setUser(getTelegramUser());
        setInitData(getInitData());
        setHasTelegramEnv(true);
      }
      setIsReady(true);
    }, SDK_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  const value = useMemo<TelegramContextValue>(
    () => ({ isReady, isTelegram, isTestMode, user, initData }),
    [isReady, isTelegram, isTestMode, user, initData]
  );

  if (!isReady) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-6"
        style={{ ...screenBg, ...screenFg }}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--tg-theme-button-color,#2481cc)] border-t-transparent"
          aria-hidden
        />
        <p className="text-sm opacity-90">Yuklanmoqda...</p>
      </div>
    );
  }

  if (!isTelegram) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center"
        style={{ ...screenBg, ...screenFg }}
      >
        <div
          className="max-w-sm rounded-2xl p-6 shadow-lg"
          style={secondaryBg}
        >
          <p className="text-lg font-medium">
            Iltimos, ilovani Telegram bot orqali oching.
          </p>
          <p className="mt-2 text-sm opacity-80">
            Usta ilovasi faqat Telegram ichida ishlaydi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TelegramContext.Provider value={value}>
      {isTestMode && (
        <div
          className="sticky top-0 z-50 border-b px-4 py-2 text-center text-sm font-medium"
          style={{ ...secondaryBg, ...screenFg }}
        >
          ⚠️ Test rejimi — brauzerda ochilgan
        </div>
      )}
      {children}
    </TelegramContext.Provider>
  );
}

export { TelegramContext };
