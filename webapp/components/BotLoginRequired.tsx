"use client";

/**
 * Botda login qilmagan foydalanuvchi WebApp ochganda ko‘radigan ekran.
 * Xavfsizlik: menyu va ma’lumotlar ko‘rinmaydi.
 */
const screenBg = { backgroundColor: "var(--tg-theme-bg-color, #1a1a1a)" };
const screenFg = { color: "var(--tg-theme-text-color, #fff)" };
const secondaryBg = { backgroundColor: "var(--tg-theme-secondary-bg-color, #2b2b2b)" };
const buttonStyle = {
  backgroundColor: "var(--tg-theme-button-color, #2481cc)",
  color: "var(--tg-theme-button-text-color, #fff)",
};

export function BotLoginRequired() {
  const botUsername =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_BOT_USERNAME?.trim()
      : "";
  const botStartUrl = botUsername ? `https://t.me/${botUsername}?start=webapp` : null;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center"
      style={{ ...screenBg, ...screenFg }}
    >
      <div className="max-w-sm rounded-2xl p-8 shadow-xl" style={secondaryBg}>
        <div className="mb-4 flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--tg-theme-button-color)]/20 text-3xl">
            🔐
          </span>
        </div>
        <h1 className="text-xl font-semibold">
          Kirish talab qilinadi
        </h1>
        <p className="mt-3 text-sm leading-relaxed opacity-90">
          Usta paneliga kirish uchun avval botda <strong>/start</strong> bosing va
          login va parolingizni kiriting. Keyin shu ilovani qayta oching.
        </p>
        <p className="mt-2 text-xs opacity-75">
          Siz tizimga kirishga ruxsat olmagan foydalanuvchisiz. Admin bilan bog‘laning.
        </p>
        {botStartUrl && (
          <a
            href={botStartUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block w-full rounded-xl py-3.5 font-medium transition opacity-95 hover:opacity-100"
            style={buttonStyle}
          >
            Botga o‘tish
          </a>
        )}
      </div>
    </div>
  );
}
