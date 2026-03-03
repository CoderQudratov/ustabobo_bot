import { Module, forwardRef } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { AuthScene } from './auth.scene';
import { BotUpdate } from './bot.update';
import { BotNotifyService } from './bot-notify.service';
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
        return {
          token,
          // Session must run first so Stage/wizard can use ctx.session (required for ctx.wizard.state)
          middlewares: [session()],
          include: [BotModule],
        };
      },
    }),
  ],
  providers: [AuthScene, BotUpdate, BotNotifyService],
  exports: [BotNotifyService],
})
export class BotModule {}
