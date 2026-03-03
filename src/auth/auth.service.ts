import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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
   * Returns tg_id from payload or throws UnauthorizedException.
   */
  validateTelegramInitData(initData: string): { tgId: number } {
    const token = process.env.BOT_TOKEN;
    if (!token?.trim()) {
      throw new UnauthorizedException('Telegram WebApp not configured');
    }
    const encoded = decodeURIComponent(initData.trim());
    const secret = crypto
      .createHmac('sha256', 'WebAppData')
      .update(token)
      .digest();
    const arr = encoded.split('&');
    const hashIdx = arr.findIndex((s) => s.startsWith('hash='));
    if (hashIdx === -1) {
      throw new UnauthorizedException('Invalid Telegram init data');
    }
    const hash = arr.splice(hashIdx, 1)[0].split('=')[1];
    arr.sort((a, b) => a.localeCompare(b));
    const dataCheckString = arr.join('\n');
    const computedHash = crypto
      .createHmac('sha256', secret)
      .update(dataCheckString)
      .digest('hex');
    if (computedHash !== hash) {
      throw new UnauthorizedException('Invalid Telegram init data signature');
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
      throw new UnauthorizedException('Master not found for this Telegram account');
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
      throw new UnauthorizedException('Foydalanuvchi topilmadi. Bot orqali kiring.');
    }
    return user;
  }
}
