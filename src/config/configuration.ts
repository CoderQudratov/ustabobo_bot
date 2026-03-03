/**
 * Centralized configuration. Single source of truth for environment.
 * Bot and backend use this; frontend uses NEXT_PUBLIC_* (build-time) for API URL.
 */

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',

  port: parseInt(process.env.PORT ?? '3000', 10),

  /** WebApp origin (HTTPS). Bot menu buttons point here. Single source of truth for WebApp URL. */
  get webappUrl(): string {
    const raw = process.env.WEBAPP_URL;
    if (raw === undefined || raw === '') return '';
    const base = String(raw).trim().replace(/\/+$/, '');
    return base;
  },

  /** Telegram Bot username for deep links (t.me/BOT_USERNAME?start=conf_UUID). */
  get telegramBotUsername(): string {
    return String(process.env.TELEGRAM_BOT_USERNAME ?? '').trim();
  },

  /** API base URL for server-side or fallback (e.g. for logs). */
  get apiBaseUrl(): string {
    const raw = process.env.API_BASE_URL ?? process.env.PORT;
    if (raw && String(raw).match(/^https?:\/\//)) return String(raw).replace(/\/+$/, '');
    const port = parseInt(String(process.env.PORT ?? '3000'), 10);
    return `http://localhost:${port}`;
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
} as const;

/** Normalized WebApp base URL; throws if not set (for bot). */
export function getWebAppBaseUrl(): string {
  const base = config.webappUrl;
  if (!base) {
    throw new Error(
      'WEBAPP_URL is not set in .env. Set WEBAPP_URL to your WebApp origin (e.g. Cloudflare tunnel URL).',
    );
  }
  return base;
}
