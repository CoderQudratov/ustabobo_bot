import { Markup } from 'telegraf';
import { getWebAppBaseUrl } from '../config/configuration';

/**
 * Build WebApp URL with optional tg_id and role for faster initial load; auth still via initData.
 */
function webAppUrl(baseUrl: string, tgId?: string | number, role?: string, path = ''): string {
  const url = new URL(path ? `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\//, '')}` : baseUrl);
  if (tgId != null) url.searchParams.set('tg_id', String(tgId));
  if (role) url.searchParams.set('role', role);
  return url.toString();
}

/**
 * Master menu: Yangi buyurtma + Mening buyurtmalarim (WebApp).
 */
export function getMasterKeyboard(tgId?: string | number) {
  const baseUrl = getWebAppBaseUrl();
  const urlWithParams = webAppUrl(baseUrl, tgId, 'master');
  return Markup.keyboard([
    [Markup.button.webApp('➕ Yangi buyurtma', urlWithParams)],
    [Markup.button.webApp('📦 Mening buyurtmalarim', urlWithParams)],
  ]).resize();
}

/**
 * Driver menu: Faol buyurtmalar, Tarix, Hamyon (WebApp).
 */
export function getDriverKeyboard(tgId?: string | number) {
  const baseUrl = getWebAppBaseUrl();
  return Markup.keyboard([
    [Markup.button.webApp('📦 Faol buyurtmalar', webAppUrl(baseUrl, tgId, 'driver', '/my-orders?filter=active'))],
    [Markup.button.webApp('🕒 Tarix', webAppUrl(baseUrl, tgId, 'driver', '/my-orders?filter=history'))],
    [Markup.button.webApp('💰 Hamyon', webAppUrl(baseUrl, tgId, 'driver', '/wallet'))],
  ]).resize();
}

/**
 * Bot menu by role: Master gets getMasterKeyboard, Driver gets getDriverKeyboard.
 * Fallback for unknown role: getMasterKeyboard (legacy getMainMenuKeyboard behaviour).
 */
export function getMainMenuKeyboard(tgId?: string | number, role?: string) {
  if (role === 'driver') {
    return getDriverKeyboard(tgId);
  }
  return getMasterKeyboard(tgId);
}

/** Single WebApp button for driver after Accept: "📦 Buyurtmani ochish". */
export function getDriverOrderWebAppKeyboard(tgId: string | number) {
  const baseUrl = getWebAppBaseUrl();
  const url = webAppUrl(baseUrl, tgId, 'driver');
  return Markup.keyboard([[Markup.button.webApp('📦 Buyurtmani ochish', url)]]).resize();
}
