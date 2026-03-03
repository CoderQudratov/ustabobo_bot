/**
 * Single source for Telegram WebApp environment detection.
 * Used to avoid calling backend when initData is missing (e.g. opened in normal browser).
 */

import type { TelegramWebApp } from "@/types/telegram";

function getWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

/** true only when WebApp exists AND initData is non-empty (valid Telegram Mini App context). */
export function isTelegramWebApp(): boolean {
  const data = getInitDataOrNull();
  return typeof data === "string" && data.trim().length > 0;
}

/** initData string if present, else null. Never log the return value. */
export function getInitDataOrNull(): string | null {
  const webApp = getWebApp();
  const data = webApp?.initData ?? null;
  return typeof data === "string" ? data : null;
}

/** Read start_param safely (e.g. from t.me/bot?startapp=orders). */
export function getStartParam(): string | null {
  const webApp = getWebApp();
  const unsafe = (webApp as { initDataUnsafe?: { start_param?: string } })?.initDataUnsafe;
  const param = unsafe?.start_param;
  return typeof param === "string" ? param : null;
}
