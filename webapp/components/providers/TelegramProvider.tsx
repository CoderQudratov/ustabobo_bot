"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import type { TelegramWebAppUser } from "@/types/telegram";
import { setSessionExpiredHandler, setPinRequiredHandler, setTelegramRequiredHandler } from "@/utils/api";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TelegramRequired } from "@/components/TelegramRequired";

const SDK_WAIT_MS = 1800;
const INIT_DATA_RETRY_MS = 400;
const INIT_DATA_RETRY_COUNT = 6;

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
  const [hasInitData, setHasInitData] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const [telegramRequired, setTelegramRequired] = useState(false);

  const isTelegram = hasTelegramEnv && hasInitData;
  const isTestMode = hasTelegramEnv && !user;

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const finish = (data: string, hasData: boolean) => {
      if (cancelled) return;
      setUser(getTelegramUser());
      setInitData(data);
      setHasInitData(hasData);
      setHasTelegramEnv(!!getWebApp());
      setIsReady(true);
    };

    const timer = setTimeout(() => {
      if (cancelled) return;
      const webApp = getWebApp();
      if (webApp) {
        try {
          const ver = (webApp as { version?: string }).version ?? "";
          if (typeof webApp.enableClosingConfirmation === "function" && ver >= "6.1") {
            webApp.enableClosingConfirmation();
          }
        } catch {
          // ignore
        }
        const data = getInitData();
        if (data?.trim()) {
          finish(data, true);
          return;
        }
        setUser(getTelegramUser());
        setHasTelegramEnv(true);
        let retries = 0;
        const poll = () => {
          if (cancelled || retries >= INIT_DATA_RETRY_COUNT) {
            finish("", false);
            return;
          }
          retries += 1;
          const next = getInitData();
          if (next?.trim()) {
            finish(next, true);
            return;
          }
          timeouts.push(setTimeout(poll, INIT_DATA_RETRY_MS));
        };
        timeouts.push(setTimeout(poll, INIT_DATA_RETRY_MS));
      } else {
        setIsReady(true);
      }
    }, SDK_WAIT_MS);
    timeouts.push(timer);

    return () => {
      cancelled = true;
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => setSessionExpired(true));
    setPinRequiredHandler(() => setPinRequired(true));
    setTelegramRequiredHandler(() => setTelegramRequired(true));
    return () => {
      setSessionExpiredHandler(null);
      setPinRequiredHandler(null);
      setTelegramRequiredHandler(null);
    };
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

  if (!isTelegram || telegramRequired) {
    const variant = hasTelegramEnv && !hasInitData ? "expired" : "outside";
    return <TelegramRequired variant={variant} />;
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
      {sessionExpired && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div
            className="max-w-sm rounded-2xl p-6 shadow-xl"
            style={{ ...secondaryBg, ...screenFg }}
          >
            <p className="text-lg font-medium">Sessiya tugadi</p>
            <p className="mt-2 text-sm opacity-90">
              Iltimos, ilovani Telegram bot orqali qayta oching.
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded-xl py-2.5 font-medium"
              style={{
                backgroundColor: "var(--tg-theme-button-color)",
                color: "var(--tg-theme-button-text-color)",
              }}
              onClick={() => setSessionExpired(false)}
            >
              Tushundim
            </button>
          </div>
        </div>
      )}
      {pinRequired && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div
            className="max-w-sm rounded-2xl p-6 shadow-xl"
            style={{ ...secondaryBg, ...screenFg }}
          >
            <p className="text-lg font-medium">🔐 PIN kiriting</p>
            <p className="mt-2 text-sm opacity-90">
              Botga qayting va PIN kiriting. Keyin ilovani qayta oching.
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded-xl py-2.5 font-medium"
              style={{
                backgroundColor: "var(--tg-theme-button-color)",
                color: "var(--tg-theme-button-text-color)",
              }}
              onClick={() => setPinRequired(false)}
            >
              Tushundim
            </button>
          </div>
        </div>
      )}
      <ErrorBoundary>{children}</ErrorBoundary>
    </TelegramContext.Provider>
  );
}

export { TelegramContext };
