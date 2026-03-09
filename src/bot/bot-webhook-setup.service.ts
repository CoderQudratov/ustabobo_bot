import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

const LOG = '[Bot]';

@Injectable()
export class BotWebhookSetupService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @InjectBot()
    private readonly bot: Telegraf,
  ) {}

  async onModuleDestroy(): Promise<void> {
    try {
      this.bot.stop('SIGTERM');
    } catch {
      // Ignore (e.g. webhook mode or already stopped)
    }
  }

  async onModuleInit(): Promise<void> {
    const publicUrl = process.env.PUBLIC_URL?.trim();
    if (publicUrl && publicUrl.startsWith('https://')) {
      const webhookPath = '/telegram/webhook';
      const webhookUrl = `${publicUrl.replace(/\/+$/, '')}${webhookPath}`;
      try {
        await this.bot.telegram.setWebhook(webhookUrl);
        if (process.env.NODE_ENV !== 'test') {
          console.log(LOG, 'Mode: webhook', webhookUrl);
        }
      } catch (err) {
        console.error(
          LOG,
          'setWebhook failed:',
          err instanceof Error ? err.message : err,
        );
      }
    } else {
      if (process.env.NODE_ENV !== 'test') {
        console.log(LOG, 'Mode: polling (PUBLIC_URL not set or not HTTPS)');
      }
    }
  }
}
