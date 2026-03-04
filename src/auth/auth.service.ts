import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../../generated/prisma/client';
import { TelegramInitDataService } from '../telegram/telegram-initdata.service';

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
    private readonly initDataService: TelegramInitDataService,
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

  /** Delegates to TelegramInitDataService (single source of truth for initData validation). */
  validateTelegramInitData(initData: string): { tgId: number; authDate: number } {
    const validated = this.initDataService.validate(initData);
    if (!validated.user?.id) {
      throw new UnauthorizedException('Telegram user missing in init data');
    }
    return { tgId: validated.user.id, authDate: validated.auth_date };
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
