import { Context } from 'telegraf';

const ERROR_CODE_PREFIX = 'ERR_BOT_';

/** Map of error codes to short descriptions for logs. */
export const BOT_ERROR_CODES = {
  START: 'ERR_BOT_001',
  TEXT: 'ERR_BOT_002',
  LOCATION: 'ERR_BOT_003',
  CONFIRM_ORDER: 'ERR_BOT_004',
  CANCEL_ORDER: 'ERR_BOT_005',
  ACCEPT_ORDER: 'ERR_BOT_006',
  CONFIRM_DELIVERY: 'ERR_BOT_007',
  REJECT_DELIVERY: 'ERR_BOT_008',
  START_WORK: 'ERR_BOT_009',
  AUTH_SCENE: 'ERR_BOT_010',
} as const;

function getContextInfo(ctx: Context): Record<string, unknown> {
  const from = ctx.from;
  const chatId = ctx.chat?.id;
  const update = (ctx as any).update;
  const updateType = update?.message ? 'message' : update?.callback_query ? 'callback_query' : 'unknown';
  return {
    chatId,
    userId: from?.id,
    updateType,
    hasScene: !!(ctx as any).scene,
  };
}

/**
 * Log bot error with code, stack, and context. No secrets (no token, no full initData).
 * Use before replying to user with a generic message so logs can be matched.
 */
export function logBotError(
  code: string,
  err: unknown,
  ctx: Context,
  extra?: Record<string, unknown>,
): void {
  const errMsg = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(`[Bot] ${code}`, {
    message: errMsg,
    ...getContextInfo(ctx),
    ...extra,
    ...(stack && { stack: stack.slice(0, 500) }),
  });
}

/**
 * User-facing message including error code so support can match logs.
 */
export function userMessageWithCode(
  code: string,
  defaultText: string = 'Xatolik yuz berdi. Qaytadan urinib ko‘ring.',
): string {
  return `${defaultText} (${code})`;
}
