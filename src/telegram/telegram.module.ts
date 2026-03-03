import { Global, Module } from '@nestjs/common';
import { TelegramInitDataService } from './telegram-initdata.service';

@Global()
@Module({
  providers: [TelegramInitDataService],
  exports: [TelegramInitDataService],
})
export class TelegramModule {}
