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

/** Master menu: Faol buyurtmalar, Tarix, Statistika, WebApp. */
export function getMasterKeyboard() {
  return Markup.keyboard([
    [{ text: '📋 Faol buyurtmalar' }],
    [{ text: '📜 Buyurtmalar tarixi' }],
    [{ text: '📊 Mening statistikam' }],
    [Markup.button.webApp('🌐 WebApp', webAppUrl(''))],
  ])
    .resize()
    .persistent();
}

/** Driver menu: Faol yetkazishlar, Yetkazish tarixi, WebApp. */
export function getDriverKeyboard() {
  return Markup.keyboard([
    [{ text: '🚗 Faol yetkazishlar' }],
    [{ text: '📜 Yetkazish tarixi' }],
    [Markup.button.webApp('🌐 WebApp', webAppUrl(''))],
  ])
    .resize()
    .persistent();
}

const DRIVER_DELIVERED_PREFIX = 'driver_delivered_';

/** Inline keyboard: [✅ Yetkazib bo'ldim] for driver to mark order delivered. */
export function getDriverDeliveredInline(orderId: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Yetkazib bo\'ldim', `${DRIVER_DELIVERED_PREFIX}${orderId}`)],
  ]);
}

export const DRIVER_DELIVERED_CB_REGEX = /^driver_delivered_(.+)$/;

/** Inline keyboard: single button to refresh master's faol buyurtmalar list. */
export function getMasterFaolRefreshInline() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔄 Yangilash', 'master_faol_refresh')],
  ]);
}

const MASTER_TARIX_PREFIX = 'master_tarix_';

/** Inline keyboard: pagination for master's buyurtmalar tarixi (skip in callback). */
export function getMasterTarixPaginationInline(
  skip: number,
  hasPrev: boolean,
  hasNext: boolean,
) {
  const row: ReturnType<typeof Markup.button.callback>[] = [];
  if (hasPrev) {
    row.push(
      Markup.button.callback(
        '⬅️ Oldingi 10',
        `${MASTER_TARIX_PREFIX}${skip - 10}`,
      ),
    );
  }
  if (hasNext) {
    row.push(
      Markup.button.callback(
        'Keyingi 10 ➡️',
        `${MASTER_TARIX_PREFIX}${skip + 10}`,
      ),
    );
  }
  return Markup.inlineKeyboard(row.length ? [row] : []);
}

export const MASTER_TARIX_CB_REGEX = /^master_tarix_(\d+)$/;

/** Boss menu: Bugungi hisobot, Haftalik, Xodimlar, Qarzlar, Kam mahsulotlar. */
export function getBossKeyboard() {
  return Markup.keyboard([
    [{ text: '📊 Bugungi hisobot' }],
    [{ text: '📈 Haftalik hisobot' }],
    [{ text: '👥 Xodimlar faolligi' }],
    [{ text: '🏢 Tashkilot qarzlari' }],
    [{ text: '📦 Kam qolgan mahsulotlar' }],
  ])
    .resize()
    .persistent();
}

/** Bot menu by role. No tg_id/role in URLs — server identifies user from initData. */
export function getMainMenuKeyboard(role?: string) {
  if (role === 'driver') return getDriverKeyboard();
  if (role === 'boss') return getBossKeyboard();
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
