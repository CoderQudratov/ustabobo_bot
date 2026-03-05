import { Module, forwardRef } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { AuthScene } from './auth.scene';
import { BotUpdate } from './bot.update';
import { BotNotifyService } from './bot-notify.service';
import { BotWebhookSetupService } from './bot-webhook-setup.service';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => OrdersModule),
    TelegrafModule.forRootAsync({
      useFactory: () => {
        const token = process.env.BOT_TOKEN?.trim();
        if (!token) {
          throw new Error('BOT_TOKEN is not set in .env');
        }
        const webappUrl = process.env.WEBAPP_URL?.trim();
        if (!webappUrl) {
          console.warn(
            '[Bot] WEBAPP_URL is not set in .env. WebApp buttons will fail. Set WEBAPP_URL to your WebApp origin (HTTPS).',
          );
          throw new Error(
            "WEBAPP_URL is not set in .env. Lokalda test qilish uchun: npx localtunnel --port 3001 qilib olingan URLni WEBAPP_URL=... qilib qo'ying.",
          );
        }
        const publicUrl = process.env.PUBLIC_URL?.trim();
        const useWebhook = !!publicUrl && publicUrl.startsWith('https://');
        return {
          token,
          middlewares: [session()],
          include: [BotModule],
          // Production (Render): use webhook; local: polling
          launchOptions: useWebhook ? false : undefined,
        };
      },
    }),
  ],
  controllers: [TelegramWebhookController],
  providers: [AuthScene, BotUpdate, BotNotifyService, BotWebhookSetupService],
  exports: [TelegrafModule, BotNotifyService],
})
export class BotModule {}
