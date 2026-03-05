import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

const LOG = '[Bot]';

@Injectable()
export class BotWebhookSetupService implements OnModuleInit {
  constructor(
    @InjectBot()
    private readonly bot: Telegraf,
  ) {}

  async onModuleInit(): Promise<void> {
    const publicUrl = process.env.PUBLIC_URL?.trim();
    if (publicUrl && publicUrl.startsWith('https://')) {
      const webhookPath = '/telegram/webhook';
      const webhookUrl = `${publicUrl.replace(/\/+$/, '')}${webhookPath}`;
      try {
        await this.bot.telegram.setWebhook(webhookUrl);
        console.log(LOG, 'Mode: webhook', webhookUrl);
      } catch (err) {
        console.error(
          LOG,
          'setWebhook failed:',
          err instanceof Error ? err.message : err,
        );
      }
    } else {
      console.log(LOG, 'Mode: polling (PUBLIC_URL not set or not HTTPS)');
    }
  }
}
