import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TelegramInitDataGuard } from '../auth/guards/telegram-initdata.guard';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

interface TelegramWebAppUser {
  id: string;
  login: string;
  role: string;
  fullname: string;
}

/**
 * Debug endpoint for WebApp: whoami (tg_id, role, is_authenticated).
 * Protected by TelegramInitDataGuard — only valid initData + DB user.
 * Used with Cloudflare tunnel to verify auth state.
 */
@Controller('debug')
@Public()
@UseGuards(TelegramInitDataGuard)
export class DebugController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('whoami')
  async whoami(@Req() req: Request & { user: TelegramWebAppUser }) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { tg_id: true, role: true, is_authenticated: true },
    });
    if (!user) {
      return { error: 'User not found' };
    }
    return {
      tg_id: user.tg_id,
      role: user.role,
      is_authenticated: user.is_authenticated,
    };
  }

  /**
   * DEV: confirms initData validation works. Returns tg_id, username, auth_date_age_sec, is_authenticated, role.
   * Protected by TelegramInitDataGuard — 200 means initData was valid.
   */
  @Get('initdata/check')
  async initDataCheck(
    @Req()
    req: Request & { user: TelegramWebAppUser; telegramAuthDate?: number },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        tg_id: true,
        role: true,
        is_authenticated: true,
        username: true,
      },
    });
    if (!user) {
      return { error: 'User not found' };
    }
    const authDate = req.telegramAuthDate ?? 0;
    const authDateAgeSec = authDate
      ? Math.floor(Date.now() / 1000) - authDate
      : null;
    return {
      tg_id: user.tg_id,
      username: user.username ?? null,
      auth_date_age_sec: authDateAgeSec,
      is_authenticated: user.is_authenticated,
      role: user.role,
    };
  }
}
