import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { TelegramWebAppGuard } from './guards/telegram-webapp.guard';
import { WebappService } from './webapp.service';

@Controller('webapp')
@Public()
export class WebappController {
  constructor(private readonly webappService: WebappService) {}

  @Get('init')
  @UseGuards(TelegramWebAppGuard)
  getInit() {
    return this.webappService.getInitData();
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
