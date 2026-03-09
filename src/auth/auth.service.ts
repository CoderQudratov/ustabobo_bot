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
  refresh_token: string;
  expires_in: number;
}

export interface RefreshPayload {
  sub: string;
  type: 'refresh';
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
    const refreshPayload: RefreshPayload = { sub: user.id, type: 'refresh' };
    const refresh_token = this.jwtService.sign(refreshPayload, {
      expiresIn: 604800,
    }); // 7 days
    return { access_token, refresh_token, expires_in: expiresIn };
  }

  async refresh(
    refreshToken: string,
  ): Promise<Omit<TokenResponse, 'refresh_token'>> {
    const payload = this.jwtService.verify<RefreshPayload>(refreshToken);
    if (payload?.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, is_active: true },
    });
    if (!user || user.role !== 'boss') {
      throw new UnauthorizedException('User not found or ERP access denied');
    }
    const jwtPayload: JwtPayload = {
      sub: user.id,
      login: user.login,
      role: user.role as Role,
    };
    const expiresIn = 3600;
    const access_token = this.jwtService.sign(jwtPayload, { expiresIn });
    return { access_token, expires_in: expiresIn };
  }

  /** Delegates to TelegramInitDataService (single source of truth for initData validation). */
  validateTelegramInitData(initData: string): {
    tgId: number;
    authDate: number;
  } {
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

  /** WebApp: login with login/password. Returns JWT (8h) + user. Only is_active users. */
  async webappLogin(login: string, password: string): Promise<{ token: string; user: { id: string; fullname: string; login: string; role: string } }> {
    const user = await this.validateUser(login, password);
    if (!user) {
      throw new UnauthorizedException('Login yoki parol xato');
    }
    const payload: JwtPayload = {
      sub: user.id,
      login: user.login,
      role: user.role as Role,
    };
    const expiresIn = '8h';
    const token = this.jwtService.sign(payload, { expiresIn });
    return {
      token,
      user: {
        id: user.id,
        fullname: user.fullname,
        login: user.login,
        role: user.role,
      },
    };
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
