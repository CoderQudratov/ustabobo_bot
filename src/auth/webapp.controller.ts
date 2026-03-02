import { Controller, Get, UseGuards } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { TelegramWebAppGuard } from './guards/telegram-webapp.guard';
import { WebappService } from './webapp.service';

@Controller('webapp')
@Public()
@UseGuards(TelegramWebAppGuard)
export class WebappController {
  constructor(private readonly webappService: WebappService) {}

  @Get('init')
  getInit() {
    return this.webappService.getInitData();
  }
}
