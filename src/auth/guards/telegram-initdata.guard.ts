import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { TelegramInitDataService } from '../../telegram/telegram-initdata.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../../generated/prisma/client';

const INIT_DATA_HEADER = 'x-telegram-init-data';

export interface TelegramWebAppUser {
  id: string;
  login: string;
  role: string;
  fullname: string;
}

/**
 * TelegramInitDataGuard: used on ALL WebApp endpoints (dashboard, wallet, my-orders, new-order,
 * orders create, upload). Reads header "x-telegram-init-data", validates via TelegramInitDataService,
 * finds DB user by tg_id (stored as STRING), attaches request.user. If user not found → 403.
 * PIN gate: if user.pin_code_hash exists and user.is_authenticated === false → 403 "🔐 Botga qayting va PIN kiriting."
 */
@Injectable()
export class TelegramInitDataGuard implements CanActivate {
  constructor(
    private readonly initDataService: TelegramInitDataService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method === 'OPTIONS') return true;
    if ((context.getType() as string) === 'telegraf') return true;

    const raw =
      typeof request.headers[INIT_DATA_HEADER] === 'string'
        ? request.headers[INIT_DATA_HEADER]
        : Array.isArray(request.headers[INIT_DATA_HEADER])
          ? request.headers[INIT_DATA_HEADER][0]
          : undefined;

    if (!raw?.trim()) {
      throw new UnauthorizedException('Telegram orqali kiring');
    }

    const validated = this.initDataService.validate(raw);
    const tgIdStr = String(validated.user!.id);
    // For /debug/initdata/check: auth_date so controller can return auth_date_age_sec
    (request as Request & { telegramAuthDate?: number }).telegramAuthDate =
      validated.auth_date;

    const user = await this.prisma.user.findFirst({
      where: {
        tg_id: tgIdStr,
        is_active: true,
        role: { in: [Role.master, Role.driver, Role.boss] },
      },
    });

    if (!user) {
      throw new ForbiddenException(
        'Foydalanuvchi topilmadi. Bot orqali kirish qiling.',
      );
    }

    // TZ: if PIN exists, WebApp blocked until bot PIN verification
    if (
      user.pin_code_hash != null &&
      user.pin_code_hash.trim() !== '' &&
      !user.is_authenticated
    ) {
      throw new ForbiddenException('🔐 Botga qayting va PIN kiriting.');
    }

    (request as Request & { user: TelegramWebAppUser }).user = {
      id: user.id,
      login: user.login,
      role: user.role,
      fullname: user.fullname,
    };
    return true;
  }
}
