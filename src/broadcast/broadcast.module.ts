import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { getRedisConnectionOptions } from '../config/configuration';
import { PrismaModule } from '../prisma/prisma.module';
import { BroadcastProducer } from './broadcast-producer.service';
import { BroadcastProcessor } from './broadcast.processor';
import { BotModule } from '../bot/bot.module';

let redisEvictionWarnedOnce = false;
function warnRedisEvictionOnce(): void {
  if (!redisEvictionWarnedOnce) {
    redisEvictionWarnedOnce = true;
    console.warn(
      '[BullMQ] If Redis shows "Eviction policy is volatile-lru", set maxmemory-policy noeviction in Redis config if possible (see RUN.md).',
    );
  }
}

@Module({
  imports: [
    BullModule.forRoot({
      connection: (() => {
        warnRedisEvictionOnce();
        return getRedisConnectionOptions();
      })(),
    }),
    BullModule.registerQueue({ name: 'broadcast_queue' }),
    PrismaModule,
    forwardRef(() => BotModule),
  ],
  providers: [BroadcastProducer, BroadcastProcessor],
  exports: [BroadcastProducer],
})
export class BroadcastModule {}
