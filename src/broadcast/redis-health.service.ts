import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class RedisHealthService {
  constructor(@InjectQueue('broadcast_queue') private readonly queue: Queue) {}

  async ping(): Promise<'pong'> {
    const client = await this.queue.client;
    const result = await client.ping();
    return result === 'PONG' ? 'pong' : (result as 'pong');
  }
}
