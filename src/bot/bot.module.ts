import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { AuthScene } from './auth.scene';
import { BotUpdate } from './bot.update';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    TelegrafModule.forRootAsync({
      useFactory: () => {
        const token = process.env.BOT_TOKEN;
        if (!token) {
          throw new Error('BOT_TOKEN is not set');
        }
        return {
          token,
          middlewares: [session()],
          include: [BotModule],
        };
      },
    }),
  ],
  providers: [AuthScene, BotUpdate],
})
export class BotModule {}
