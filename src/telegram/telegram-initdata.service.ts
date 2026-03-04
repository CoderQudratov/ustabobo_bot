import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { getValidatedBotToken } from '../config/env';

/** Parsed Telegram user from initData (subset of WebAppUser). */
export interface TelegramInitDataUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

/** Result of successful initData validation. */
export interface ValidatedInitData {
  auth_date: number;
  user?: TelegramInitDataUser;
  hash: string;
}

const DEFAULT_MAX_AGE_SEC = 300; // 5 minutes
const CLOCK_SKEW_TOLERANCE_SEC = 120; // allow 2 min skew so "session expired" is less frequent

const LOG_PREFIX = '[TelegramInitData]';

/**
 * Validates Telegram WebApp initData (ONLY trust source for WebApp auth).
 * Per official docs: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * 1) Parse initData, extract hash
 * 2) data_check_string = all keys except hash, sorted alphabetically, key=value joined by "\n"
 * 3) secret_key = HMAC_SHA256(key: "WebAppData", value: bot_token)
 * 4) computed_hash = hex(HMAC_SHA256(secret_key, data_check_string))
 * 5) Compare computed_hash with provided hash
 * 6) Validate auth_date (max age configurable via TELEGRAM_INIT_DATA_MAX_AGE_SEC)
 * 7) Return parsed Telegram user (id, etc.)
 */
@Injectable()
export class TelegramInitDataService {
  private readonly botToken: string;
  private readonly maxAgeSec: number;

  constructor() {
    this.botToken = getValidatedBotToken();
    const max = process.env.TELEGRAM_INIT_DATA_MAX_AGE_SEC;
    this.maxAgeSec = max ? parseInt(max, 10) : DEFAULT_MAX_AGE_SEC;
  }

  /**
   * Validate raw initData string and return parsed payload.
   * Logs failure reason in dev only (never raw initData or token).
   * @throws UnauthorizedException if invalid or expired
   */
  validate(initData: string): ValidatedInitData {
    let raw = initData?.trim();
    if (!raw) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          LOG_PREFIX,
          'validation failed: missing header or empty initData',
        );
      }
      throw new UnauthorizedException('Telegram orqali kiring');
    }

    // If header was percent-encoded as a whole (e.g. by proxy), decode once
    if (!raw.includes('&') && raw.includes('%')) {
      try {
        raw = decodeURIComponent(raw);
      } catch {
        // keep raw
      }
    }

    const params = new URLSearchParams(raw);
    const hash = params.get('hash');
    if (!hash) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(LOG_PREFIX, 'validation failed: missing hash in initData');
      }
      throw new UnauthorizedException('Invalid Telegram init data');
    }

    // Telegram docs: secret_key = HMAC_SHA256(key: "WebAppData", value: bot_token)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(this.botToken)
      .digest();

    const tryValidate = (dataCheckString: string): boolean => {
      const computed = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
      if (computed.length !== hash.length) return false;
      try {
        return crypto.timingSafeEqual(
          Buffer.from(computed, 'hex'),
          Buffer.from(hash, 'hex'),
        );
      } catch {
        return false;
      }
    };

    // 1) data_check_string from raw pairs (encoded values, per Telegram docs)
    const pairsRaw = raw.split('&').filter((s) => !s.startsWith('hash='));
    pairsRaw.sort((a, b) => {
      const keyA = a.indexOf('=') >= 0 ? a.slice(0, a.indexOf('=')) : a;
      const keyB = b.indexOf('=') >= 0 ? b.slice(0, b.indexOf('=')) : b;
      return keyA.localeCompare(keyB);
    });
    const dataCheckStringRaw = pairsRaw.join('\n');
    if (tryValidate(dataCheckStringRaw)) {
      // proceed to auth_date and user checks below
    } else {
      // 2) some clients/specs use decoded values in data_check_string
      const keys = Array.from(params.keys()).filter((k) => k !== 'hash').sort();
      const dataCheckStringDecoded = keys
        .map((k) => `${k}=${params.get(k)}`)
        .join('\n');
      if (!tryValidate(dataCheckStringDecoded)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            LOG_PREFIX,
            'validation failed: signature mismatch (BOT_TOKEN = same bot as Mini App?)',
          );
        }
        throw new UnauthorizedException('Invalid Telegram init data signature');
      }
    }

    const authDate = params.get('auth_date');
    const authDateNum = authDate ? parseInt(authDate, 10) : 0;
    if (this.maxAgeSec > 0 && authDateNum) {
      const now = Math.floor(Date.now() / 1000);
      const age = now - authDateNum;
      const maxAllowed = this.maxAgeSec + CLOCK_SKEW_TOLERANCE_SEC;
      if (age > maxAllowed) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(LOG_PREFIX, 'validation failed: auth_date too old', {
            ageSec: age,
            maxAgeSec: this.maxAgeSec,
            clockSkew: CLOCK_SKEW_TOLERANCE_SEC,
          });
        }
        throw new UnauthorizedException(
          'Telegram sessiyasi eskirgan. Bot orqali qayta oching.',
        );
      }
    }

    let user: TelegramInitDataUser | undefined;
    const userStr = params.get('user');
    if (userStr) {
      try {
        // params.get() already returns URL-decoded value; do not double-decode
        const parsed = JSON.parse(userStr) as {
          id?: number;
          first_name?: string;
          last_name?: string;
          username?: string;
          language_code?: string;
        };
        if (parsed?.id != null && typeof parsed.id === 'number') {
          user = {
            id: parsed.id,
            first_name: parsed.first_name ?? '',
            last_name: parsed.last_name,
            username: parsed.username,
            language_code: parsed.language_code,
          };
        }
      } catch {
        // user is optional for some flows
      }
    }

    if (!user?.id) {
      throw new UnauthorizedException('Telegram user missing in init data');
    }

    return { auth_date: authDateNum, user, hash };
  }
}
