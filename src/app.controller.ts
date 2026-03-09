import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { AppService } from './app.service';
import { RedisHealthService } from './broadcast/redis-health.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly redisHealth: RedisHealthService,
  ) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  /** For Render port detection and quick health checks. No auth. */
  @Get('health')
  @Public()
  getHealth(): { status: string; service: string } {
    return {
      status: 'ok',
      service: 'ustabobo-backend',
    };
  }

  /** Redis connectivity check. No auth. Returns 503 if Redis is down. */
  @Get('health/redis')
  @Public()
  async getRedisHealth(): Promise<{ status: string; redis: string }> {
    try {
      const pong = await this.redisHealth.ping();
      return { status: 'ok', redis: pong };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new ServiceUnavailableException({
        status: 'error',
        redis: message,
      });
    }
  }
}
