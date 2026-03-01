import { Markup } from 'telegraf';

/** WebApp URL for "Yangi buyurtma" (TZ 6.1). Use placeholder if not set. */
const WEBAPP_URL =
  process.env.WEBAPP_URL?.trim() || 'https://avto-pro-webapp.example.com';

export function getMainMenuKeyboard() {
  return Markup.keyboard(
    [
      Markup.button.webApp('➕ Yangi buyurtma', WEBAPP_URL),
      '📋 Buyurtmalarim',
      '📍 Lokatsiya yuborish',
      '📦 Qabul qildim',
      '🔵 Ishni yakunlash',
    ],
    { columns: 1 },
  ).resize();
}
