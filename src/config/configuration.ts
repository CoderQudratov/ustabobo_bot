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

  /** API base URL. Never localhost in production — frontend/WebApp must call PUBLIC_URL. */
  get apiBaseUrl(): string {
    const isProduction = process.env.NODE_ENV === 'production';
    const publicUrl = process.env.PUBLIC_URL?.trim();
    if (publicUrl && publicUrl.match(/^https?:\/\//))
      return publicUrl.replace(/\/+$/, '');
    if (isProduction) {
      console.warn(
        '[Config] PUBLIC_URL not set in production; API URL may be wrong for WebApp.',
      );
    }
    const raw = process.env.API_BASE_URL?.trim();
    if (raw && raw.match(/^https?:\/\//)) return raw.replace(/\/+$/, '');
    const port = parseInt(String(process.env.PORT ?? '3000'), 10);
    return `http://localhost:${port}`;
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
    tls: process.env.REDIS_TLS === 'true' || process.env.REDIS_TLS === '1',
  },
} as const;

/** Redis connection URL if set (e.g. Redis Cloud: rediss://default:PASSWORD@host:port). */
export function getRedisUrl(): string | undefined {
  const url = process.env.REDIS_URL?.trim();
  return url && url.length > 0 ? url : undefined;
}

/**
 * BullMQ/ioredis connection options.
 * If REDIS_URL is set: parsed (host, port, password, tls for rediss://).
 * Else: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_TLS.
 */
export function getRedisConnectionOptions(): {
  host: string;
  port: number;
  password?: string;
  tls?: object;
  maxRetriesPerRequest?: number | null;
} {
  const url = getRedisUrl();
  if (url) {
    try {
      const u = new URL(url);
      const port = u.port ? parseInt(u.port, 10) : 6379;
      const password = u.password ? decodeURIComponent(u.password) : undefined;
      const tls = u.protocol === 'rediss:';
      return {
        host: u.hostname,
        port: Number.isNaN(port) ? 6379 : port,
        password,
        ...(tls && { tls: {} }),
        maxRetriesPerRequest: null,
      };
    } catch {
      // fallback to host/port if URL invalid
    }
  }
  const host = process.env.REDIS_HOST ?? 'localhost';
  const port = parseInt(process.env.REDIS_PORT ?? '6379', 10);
  const password = process.env.REDIS_PASSWORD?.trim() || undefined;
  const useTls =
    process.env.REDIS_TLS === 'true' || process.env.REDIS_TLS === '1';
  return {
    host,
    port: Number.isNaN(port) ? 6379 : port,
    password,
    ...(useTls && { tls: {} }),
    maxRetriesPerRequest: null,
  };
}

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
