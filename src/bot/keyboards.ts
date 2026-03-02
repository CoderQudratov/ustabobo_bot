import { Markup } from 'telegraf';

const WEBAPP_ENV_KEY = 'WEBAPP_URL';

/**
 * Returns normalized WebApp base URL (trimmed, no trailing slash).
 * Ensures concatenation (e.g. base + '/new-order') never produces double slashes.
 * Throws if WEBAPP_URL is not set; logs a warning so the developer sees it immediately.
 */
function getWebAppBaseUrl(): string {
  const raw = process.env[WEBAPP_ENV_KEY];
  if (raw === undefined || raw === '') {
    console.warn(
      `[Bot] ${WEBAPP_ENV_KEY} is not set in .env. WebApp buttons will fail. Set WEBAPP_URL to your WebApp origin (e.g. Cloudflare tunnel URL).`,
    );
    throw new Error(
      'WEBAPP_URL is not set in .env. Lokalda test qilish uchun: npx localtunnel --port 3001 qilib olingan URLni .env da WEBAPP_URL=... qilib qo\'ying.',
    );
  }
  const trimmed = raw.trim();
  const base = trimmed.replace(/\/+$/, '');
  return base || trimmed;
}

/**
 * Master menu keyboard per TZ §6.1. NEVER caches URLs — reads process.env.WEBAPP_URL on every call.
 * Uses ONLY Markup.button.webApp (never Markup.button.url) so Telegram injects initData.
 * Both buttons point to base WEBAPP_URL (unified dashboard at /); no hardcoded paths.
 */
export function getMainMenuKeyboard() {
  const baseUrl = getWebAppBaseUrl();

  return Markup.keyboard([
    [Markup.button.webApp('➕ Yangi buyurtma', baseUrl)],
    [Markup.button.webApp('📦 Mening buyurtmalarim', baseUrl)],
    [Markup.button.locationRequest('📍 Lokatsiya yuborish')],
    ['📦 Qabul qildim'],
    ['🔵 Ishni yakunlash'],
  ]).resize();
}
