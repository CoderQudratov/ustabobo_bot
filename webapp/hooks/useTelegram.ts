"use client";

import { useContext } from "react";
import { TelegramContext } from "@/components/providers/TelegramProvider";

export function useTelegram() {
  const ctx = useContext(TelegramContext);
  if (!ctx) {
    throw new Error("useTelegram must be used within TelegramProvider");
  }
  return ctx;
}
