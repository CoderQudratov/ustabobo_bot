import { Markup } from 'telegraf';
import { getWebAppBaseUrl } from '../config/configuration';

const PIN_CB = {
  digit: (d: string) => `pin_d_${d}`,
  clear: 'pin_clear',
  ok: 'pin_ok',
};

/** Inline keyboard for PIN entry: 1-9, 0, C (clear), OK. */
export function getPinEntryKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('1', PIN_CB.digit('1')),
      Markup.button.callback('2', PIN_CB.digit('2')),
      Markup.button.callback('3', PIN_CB.digit('3')),
    ],
    [
      Markup.button.callback('4', PIN_CB.digit('4')),
      Markup.button.callback('5', PIN_CB.digit('5')),
      Markup.button.callback('6', PIN_CB.digit('6')),
    ],
    [
      Markup.button.callback('7', PIN_CB.digit('7')),
      Markup.button.callback('8', PIN_CB.digit('8')),
      Markup.button.callback('9', PIN_CB.digit('9')),
    ],
    [
      Markup.button.callback('C', PIN_CB.clear),
      Markup.button.callback('0', PIN_CB.digit('0')),
      Markup.button.callback('OK', PIN_CB.ok),
    ],
  ]);
}

export const PIN_CALLBACK_PREFIX = 'pin_';

/**
 * Build WebApp URL: WEBAPP_BASE_URL + path only.
 * NEVER add tg_id or role to URL — identity comes from Telegram.WebApp.initData validated on backend.
 */
function webAppUrl(path = ''): string {
  const base = getWebAppBaseUrl().replace(/\/+$/, '');
  const p = path ? `/${path.replace(/^\//, '')}` : '';
  return `${base}${p}`;
}

/** Master menu: Yangi buyurtma + Mening buyurtmalarim (WebApp). */
export function getMasterKeyboard() {
  return Markup.keyboard([
    [Markup.button.webApp('➕ Yangi buyurtma', webAppUrl('/new-order'))],
    [Markup.button.webApp('📦 Mening buyurtmalarim', webAppUrl('/my-orders'))],
  ]).resize();
}

/** Driver menu: Faol buyurtmalar, Tarix, Hamyon (WebApp). */
export function getDriverKeyboard() {
  return Markup.keyboard([
    [
      Markup.button.webApp(
        '📦 Faol buyurtmalar',
        webAppUrl('/my-orders?role=driver&filter=active'),
      ),
    ],
    [Markup.button.webApp('🕒 Tarix', webAppUrl('/my-orders?role=driver&filter=history'))],
    [Markup.button.webApp('💰 Hamyon', webAppUrl('/wallet'))],
  ]).resize();
}

/** Bot menu by role. No tg_id/role in URLs — server identifies user from initData. */
export function getMainMenuKeyboard(role?: string) {
  if (role === 'driver') {
    return getDriverKeyboard();
  }
  return getMasterKeyboard();
}

/**
 * Inline WebApp button for driver after Accept order.
 * Shown INSIDE the message (not as reply keyboard at bottom).
 */
export function getDriverOrderInlineKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.webApp(
        '📦 Buyurtmani ochish',
        webAppUrl('/my-orders?filter=active'),
      ),
    ],
  ]);
}

/**
 * Inline WebApp button for a specific order.
 * When pressed, shows Telegram "Launch" popup then opens Mini App at /driver/order/:id
 * This is an INLINE keyboard (inside the message), NOT a reply keyboard (bottom bar).
 */
export function getDriverOrderInlineButton(orderId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.webApp(
        "📦 Buyurtmani ko'rish",
        webAppUrl(`/driver/order/${orderId}?role=driver`),
      ),
    ],
  ]);
}

/**
 * Inline WebApp button for master — opens specific order in My Orders page.
 * Used after: work started (masterStartWork) and delivery confirmed (masterConfirmDelivery).
 * URL format: /my-orders?open=ORDER_ID
 * TZ §8.3, §9.1 — master must be able to navigate to order with one tap after status change.
 */
export function getMasterOrderInlineButton(orderId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.webApp(
        '📋 Buyurtmani ochish',
        webAppUrl(`/my-orders?open=${orderId}`),
      ),
    ],
  ]);
}
