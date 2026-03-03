import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../../generated/prisma/client';

export interface JwtPayload {
  sub: string;
  login: string;
  role: Role;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(login: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { login, is_active: true },
    });
    if (!user) {
      return null;
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return null;
    }
    return user;
  }

  async login(login: string, password: string): Promise<TokenResponse> {
    const user = await this.validateUser(login, password);
    if (!user) {
      throw new UnauthorizedException('Invalid login or password');
    }
    if (user.role !== 'boss') {
      throw new UnauthorizedException('ERP access is for boss only');
    }
    const payload: JwtPayload = {
      sub: user.id,
      login: user.login,
      role: user.role as Role,
    };
    const expiresIn = 3600; // 1 hour
    const access_token = this.jwtService.sign(payload, { expiresIn });
    return { access_token, expires_in: expiresIn };
  }

  /**
   * Validates Telegram WebApp initData (HMAC-SHA256 with bot token).
   * Tries raw then decoded data_check_string so both Telegram clients work.
   */
  validateTelegramInitData(initData: string): { tgId: number } {
    const token = process.env.BOT_TOKEN?.trim();
    if (!token) {
      throw new UnauthorizedException('Telegram WebApp not configured');
    }
    let raw = initData.trim();
    if (!raw) {
      throw new UnauthorizedException('Telegram orqali kiring');
    }
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
      throw new UnauthorizedException('Invalid Telegram init data');
    }
    const secretKey = crypto
      .createHmac('sha256', token)
      .update('WebAppData')
      .digest();
    const tryValidate = (dataCheckString: string): boolean => {
      const computed = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
      return computed === hash;
    };
    const arr = raw.split('&').filter((s) => !s.startsWith('hash='));
    arr.sort((a, b) => {
      const keyA = a.indexOf('=') >= 0 ? a.slice(0, a.indexOf('=')) : a;
      const keyB = b.indexOf('=') >= 0 ? b.slice(0, b.indexOf('=')) : b;
      return keyA.localeCompare(keyB);
    });
    const dataCheckStringRaw = arr.join('\n');
    if (!tryValidate(dataCheckStringRaw)) {
      const keys = Array.from(params.keys()).filter((k) => k !== 'hash').sort();
      const dataCheckStringDecoded = keys
        .map((k) => `${k}=${params.get(k)}`)
        .join('\n');
      if (!tryValidate(dataCheckStringDecoded)) {
        throw new UnauthorizedException('Invalid Telegram init data signature');
      }
    }
    const maxAgeSec = process.env.TELEGRAM_INIT_DATA_MAX_AGE_SEC
      ? parseInt(process.env.TELEGRAM_INIT_DATA_MAX_AGE_SEC, 10)
      : 300;
    const authDateStr = params.get('auth_date');
    const authDate = authDateStr ? parseInt(authDateStr, 10) : 0;
    if (maxAgeSec > 0 && authDate > 0) {
      const age = Math.floor(Date.now() / 1000) - authDate;
      if (age > maxAgeSec) {
        throw new UnauthorizedException(
          'Telegram sessiyasi eskirgan. Bot orqali qayta oching.',
        );
      }
    }
    const userParam = arr.find((s) => s.startsWith('user='));
    if (!userParam) {
      throw new UnauthorizedException('Telegram user missing in init data');
    }
    const userJson = decodeURIComponent(userParam.slice(5));
    let user: { id?: number };
    try {
      user = JSON.parse(userJson) as { id?: number };
    } catch {
      throw new UnauthorizedException('Invalid Telegram user in init data');
    }
    if (user.id == null || typeof user.id !== 'number') {
      throw new UnauthorizedException('Telegram user id missing');
    }
    return { tgId: user.id };
  }

  async getMasterByTgId(tgId: number) {
    const user = await this.prisma.user.findFirst({
      where: {
        tg_id: String(tgId),
        role: Role.master,
        is_active: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException(
        'Master not found for this Telegram account',
      );
    }
    return user;
  }

  /** WebApp: resolve user by Telegram ID (master, driver, or boss). Used by TelegramWebAppGuard for "My Orders" and driver-finish. */
  async getUserByTgId(tgId: number) {
    const user = await this.prisma.user.findFirst({
      where: {
        tg_id: String(tgId),
        role: { in: [Role.master, Role.driver, Role.boss] },
        is_active: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException(
        'Foydalanuvchi topilmadi. Bot orqali kiring.',
      );
    }
    return user;
  }
}
