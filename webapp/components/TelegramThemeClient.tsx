"use client";

import { useEffect } from "react";

/** Hex rangdan yorug‘lik (0–1) — dark/light aniqlash uchun */
function luminance(hex: string): number {
  const n = hex.replace(/^#/, "");
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Telegram mavzu parametrlarini :root ga yozadi va data-theme (dark/light) belgilaydi.
 * Gibrid rejim: qorong‘u va yorug‘da ham siliq ko‘rinish.
 */
export function TelegramThemeClient() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const webApp = window.Telegram?.WebApp;
    const root = document.documentElement;
    const style = root.style;

    if (webApp) {
      const theme = webApp.themeParams;
      if (theme && typeof theme === "object") {
        if (theme.bg_color) style.setProperty("--tg-theme-bg-color", theme.bg_color);
        if (theme.text_color) style.setProperty("--tg-theme-text-color", theme.text_color);
        if (theme.hint_color) style.setProperty("--tg-theme-hint-color", theme.hint_color);
        if (theme.link_color) style.setProperty("--tg-theme-link-color", theme.link_color);
        if (theme.button_color) style.setProperty("--tg-theme-button-color", theme.button_color);
        if (theme.button_text_color) style.setProperty("--tg-theme-button-text-color", theme.button_text_color);
        if (theme.secondary_bg_color) style.setProperty("--tg-theme-secondary-bg-color", theme.secondary_bg_color);
        const isDark = theme.bg_color ? luminance(theme.bg_color) < 0.4 : false;
        root.dataset.theme = isDark ? "dark" : "light";
        style.setProperty(
          "--border-fallback",
          isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb"
        );
      }
    } else {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = dark ? "dark" : "light";
    }

    if (webApp) {
      if (typeof webApp.ready === "function") webApp.ready();
      if (typeof webApp.expand === "function") webApp.expand();
    }
  }, []);

  return null;
}
