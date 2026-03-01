import { Markup } from 'telegraf';

const WEBAPP_URL = 'https://google.com';

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
