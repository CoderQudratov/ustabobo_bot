import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import {
  TelegramWebAppGuard,
  TelegramWebAppUser,
} from './guards/telegram-webapp.guard';
import { WebappService } from './webapp.service';

@Controller('webapp')
@Public()
export class WebappController {
  constructor(private readonly webappService: WebappService) {}

  /** Returns JSON only (no redirect). Validates initData (BOT_TOKEN hash + auth_date). */
  @Get('init')
  @UseGuards(TelegramWebAppGuard)
  async getInit(@Req() req: Request & { user: TelegramWebAppUser }) {
    const user = req.user;
    const telegramId = user.telegramId;
    const firstName =
      user.fullname?.trim().split(/\s+/)[0] || user.login || '';
    console.log('WEBAPP INIT USER', telegramId);

    const catalog = await this.webappService.getInitData();
    return {
      ok: true,
      telegramId,
      username: user.login,
      firstName,
      authDate: user.authDate,
      ...catalog,
    };
  }

  /** Error Boundary reporting: log client errors with telegram_id for debugging. No auth required. */
  @Post('log-error')
  logError(
    @Body() body: { message?: string; stack?: string; telegram_id?: string },
  ) {
    const { message, stack, telegram_id } = body ?? {};
    console.error('[WebApp Error]', { message, stack, telegram_id });
    return { ok: true };
  }
}
