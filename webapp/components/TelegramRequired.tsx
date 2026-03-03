"use client";

/**
 * Blocking screen when WebApp is opened outside Telegram or initData is missing/expired.
 * No backend calls; use theme vars for native Telegram look.
 */
export type TelegramRequiredVariant = "outside" | "expired";

const screenBg = { backgroundColor: "var(--tg-theme-bg-color, #1a1a1a)" };
const screenFg = { color: "var(--tg-theme-text-color, #fff)" };
const secondaryBg = { backgroundColor: "var(--tg-theme-secondary-bg-color, #2b2b2b)" };
const buttonStyle = {
  backgroundColor: "var(--tg-theme-button-color, #2481cc)",
  color: "var(--tg-theme-button-text-color, #fff)",
};

export function TelegramRequired({ variant = "outside" }: { variant?: TelegramRequiredVariant }) {
  const botUsername = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_BOT_USERNAME?.trim() : process.env.NEXT_PUBLIC_BOT_USERNAME?.trim();
  const botUrl = botUsername ? `https://t.me/${botUsername}` : null;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center"
      style={{ ...screenBg, ...screenFg }}
    >
      <div className="max-w-sm rounded-2xl p-6 shadow-lg" style={secondaryBg}>
        <p className="text-lg font-medium">
          Sessiya tugadi yoki Telegram orqali ochilmagan.
        </p>
        <p className="mt-2 text-sm opacity-80">
          Iltimos, ilovani bot orqali qayta oching.
        </p>
        {variant === "outside" && botUrl && (
          <a
            href={botUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block w-full rounded-xl py-2.5 font-medium"
            style={buttonStyle}
          >
            Botni ochish
          </a>
        )}
        {variant === "expired" && (
          <p className="mt-4 text-sm opacity-90">
            Botga qayting, /start bosing va qayta kiring.
          </p>
        )}
      </div>
    </div>
  );
}
