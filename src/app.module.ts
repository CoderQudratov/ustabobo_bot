import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { getRedisConnectionOptions } from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { TelegramModule } from './telegram/telegram.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { BroadcastModule } from './broadcast/broadcast.module';
import { BotModule } from './bot/bot.module';
import { UploadModule } from './upload/upload.module';
import { AdminModule } from './admin/admin.module';
import { DebugModule } from './debug/debug.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { HttpThrottlerGuard } from './common/guards/http-throttler.guard';

const imports = [
  BullModule.forRoot({
    connection: getRedisConnectionOptions(),
  }),
  ThrottlerModule.forRoot({
    throttlers: [
      {
        name: 'global',
        ttl: 60,
        limit: 120,
      },
      {
        name: 'login',
        ttl: 60,
        limit: 5,
      },
    ],
  }),
  PrismaModule,
  TelegramModule,
  BotModule,
  AuthModule,
  OrdersModule,
  BroadcastModule,
  UploadModule,
  AdminModule,
];
if (process.env.NODE_ENV !== 'production') {
  imports.push(DebugModule);
}

@Module({
  imports,
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: HttpThrottlerGuard },
  ],
})
export class AppModule {}
