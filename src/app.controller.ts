import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

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
}
