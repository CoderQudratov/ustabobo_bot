"use client";

import { useEffect } from "react";

/**
 * Applies Telegram theme params to document.documentElement only on client after mount.
 * Avoids server-set style on <html> so hydration stays consistent.
 * Also calls ready() and expand() so Telegram knows the app is ready.
 */
export function TelegramThemeClient() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

    const theme = webApp.themeParams;
    if (theme && typeof theme === "object") {
      const root = document.documentElement;
      const style = root.style;
      if (theme.bg_color) style.setProperty("--tg-theme-bg-color", theme.bg_color);
      if (theme.text_color) style.setProperty("--tg-theme-text-color", theme.text_color);
      if (theme.hint_color) style.setProperty("--tg-theme-hint-color", theme.hint_color);
      if (theme.link_color) style.setProperty("--tg-theme-link-color", theme.link_color);
      if (theme.button_color) style.setProperty("--tg-theme-button-color", theme.button_color);
      if (theme.button_text_color) style.setProperty("--tg-theme-button-text-color", theme.button_text_color);
      if (theme.secondary_bg_color) style.setProperty("--tg-theme-secondary-bg-color", theme.secondary_bg_color);
    }

    if (typeof webApp.ready === "function") webApp.ready();
    if (typeof webApp.expand === "function") webApp.expand();
  }, []);

  return null;
}
