"use client";

import { useEffect, useCallback } from "react";

/**
 * Telegram WebApp native controls: MainButton, BackButton, HapticFeedback.
 * Use after useTelegram().isReady.
 */
export function useTelegramApp() {
  const webApp = typeof window !== "undefined" ? window.Telegram?.WebApp : null;

  useEffect(() => {
    if (!webApp) return;
    webApp.ready();
    webApp.expand();
  }, [webApp]);

  const showMainButton = useCallback(
    (text: string, onClick: () => void) => {
      if (!webApp?.MainButton) return;
      webApp.MainButton.setText(text);
      webApp.MainButton.onClick(onClick);
      webApp.MainButton.show();
    },
    [webApp]
  );

  const hideMainButton = useCallback(() => {
    webApp?.MainButton?.hide();
  }, [webApp]);

  const showBackButton = useCallback(
    (onClick: () => void) => {
      if (!webApp?.BackButton) return;
      webApp.BackButton.onClick(onClick);
      webApp.BackButton.show();
    },
    [webApp]
  );

  const hideBackButton = useCallback(() => {
    webApp?.BackButton?.hide();
  }, [webApp]);

  const haptic = useCallback(
    (type: "success" | "error" | "warning" | "selectionChanged" = "selectionChanged") => {
      try {
        if (type === "selectionChanged") {
          webApp?.HapticFeedback?.selectionChanged?.();
        } else {
          webApp?.HapticFeedback?.notificationOccurred?.(type);
        }
      } catch {
        // ignore
      }
    },
    [webApp]
  );

  return {
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    haptic,
    webApp,
  };
}
