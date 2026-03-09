import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { BroadcastProducer } from './broadcast-producer.service';
import { BroadcastProcessor } from './broadcast.processor';
import { RedisHealthService } from './redis-health.service';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'broadcast_queue' }),
    PrismaModule,
    forwardRef(() => BotModule),
  ],
  providers: [BroadcastProducer, BroadcastProcessor, RedisHealthService],
  exports: [BroadcastProducer, RedisHealthService],
})
export class BroadcastModule {}
