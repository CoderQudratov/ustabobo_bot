/**
 * Backend env: load once, validate required vars, fail fast.
 * Prevents BOT_TOKEN placeholder or duplicate .env keys from causing "Invalid Telegram init data signature".
 */

const BOT_TOKEN_PLACEHOLDER = 'your_bot_token_here';

/** Call at startup (main.ts). Throws if BOT_TOKEN missing or equals placeholder. */
export function validateEnv(): void {
  const token = process.env.BOT_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "BOT_TOKEN .env da yo'q. BotFather dan token oling va .env ga BOT_TOKEN=... qiling. Takrorlangan BOT_TOKEN qatorlarini olib tashlang.",
    );
  }
  if (token === BOT_TOKEN_PLACEHOLDER) {
    throw new Error(
      `BOT_TOKEN hali placeholder ("${BOT_TOKEN_PLACEHOLDER}"). BotFather dan haqiqiy token oling va .env da faqat bitta BOT_TOKEN=... qiling.`,
    );
  }

  if (process.env.NODE_ENV === 'production') {
    const jwt = process.env.JWT_SECRET?.trim();
    if (
      !jwt ||
      jwt === 'avtopro-erp-secret-change-in-production'
    ) {
      throw new Error(
        "JWT_SECRET production da o'rnatilmagan yoki default qiymatda. .env da kuchli JWT_SECRET=... qiling.",
      );
    }
  }
}

/** Safe startup config for logging (no secrets). Call after validateEnv(). */
export function getSafeStartupConfig(): {
  botTokenPrefix: string;
  webappUrl: string;
  nodeEnv: string;
  initDataMaxAgeSec: number;
} {
  const token = process.env.BOT_TOKEN?.trim() ?? '';
  const prefix = token.length >= 10 ? token.slice(0, 10) + '…' : "(yo'q)";
  const webappUrl = (process.env.WEBAPP_URL ?? '').trim() || "(o'rnatilmagan)";
  const maxAge = process.env.TELEGRAM_INIT_DATA_MAX_AGE_SEC;
  const initDataMaxAgeSec = maxAge ? parseInt(maxAge, 10) : 600;
  return {
    botTokenPrefix: prefix,
    webappUrl,
    nodeEnv: process.env.NODE_ENV ?? 'development',
    initDataMaxAgeSec: Number.isNaN(initDataMaxAgeSec)
      ? 600
      : initDataMaxAgeSec,
  };
}

/** Returns BOT_TOKEN; only safe to call after validateEnv() has run (e.g. in services after app bootstrap). */
export function getValidatedBotToken(): string {
  const token = process.env.BOT_TOKEN?.trim();
  if (!token || token === BOT_TOKEN_PLACEHOLDER) {
    throw new Error(
      'BOT_TOKEN not validated. Ensure validateEnv() is called at startup.',
    );
  }
  return token;
}
