import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { getRedisConnectionOptions } from '../config/configuration';
import { PrismaModule } from '../prisma/prisma.module';
import { BroadcastProducer } from './broadcast-producer.service';
import { BroadcastProcessor } from './broadcast.processor';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: getRedisConnectionOptions(),
    }),
    BullModule.registerQueue({ name: 'broadcast_queue' }),
    PrismaModule,
    BotModule,
  ],
  providers: [BroadcastProducer, BroadcastProcessor],
  exports: [BroadcastProducer],
})
export class BroadcastModule {}
