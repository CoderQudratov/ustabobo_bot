import { Body, Controller, Post } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { Public } from '../common/decorators/public.decorator';

/**
 * Receives Telegram updates when bot runs in webhook mode (PUBLIC_URL set on Render).
 * Telegram sends POST with JSON body (Update).
 */
@Controller('telegram')
@Public()
export class TelegramWebhookController {
  constructor(
    @InjectBot()
    private readonly bot: Telegraf,
  ) {}

  @Post('webhook')
  async webhook(@Body() body: Record<string, unknown>): Promise<void> {
    await this.bot.handleUpdate(body as any);
  }
}
