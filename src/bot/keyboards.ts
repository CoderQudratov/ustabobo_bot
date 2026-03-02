import { Markup } from 'telegraf';

function getWebAppUrl(): string {
  const url = process.env.WEBAPP_URL?.trim();
  if (!url) {
    throw new Error(
      'WEBAPP_URL is not set in .env. Lokalda test qilish uchun: npx localtunnel --port 3001 qilib olingan URLni .env da WEBAPP_URL=... qilib qo\'ying.',
    );
  }
  return url;
}

export function getMainMenuKeyboard() {
  return Markup.keyboard(
    [
      Markup.button.webApp('➕ Yangi buyurtma', getWebAppUrl()),
      '📋 Buyurtmalarim',
      '📍 Lokatsiya yuborish',
      '📦 Qabul qildim',
      '🔵 Ishni yakunlash',
    ],
    { columns: 1 },
  ).resize();
}
