import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BotModule } from '../bot/bot.module';
import { ProductsService } from './products.service';
import { StockAlertService } from './stock-alert.service';

@Module({
  imports: [PrismaModule, forwardRef(() => BotModule)],
  controllers: [],
  providers: [ProductsService, StockAlertService],
  exports: [ProductsService, StockAlertService],
})
export class ProductsModule {}
