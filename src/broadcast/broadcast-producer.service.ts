import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const BROADCAST_JOB_NAME = 'broadcast_order';

@Injectable()
export class BroadcastProducer {
  constructor(
    @InjectQueue('broadcast_queue') private readonly queue: Queue,
  ) {}

  broadcastOrder(orderId: string): Promise<void> {
    return this.queue.add(BROADCAST_JOB_NAME, { orderId }).then(() => undefined);
  }
}
