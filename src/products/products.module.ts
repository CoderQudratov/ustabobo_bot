import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BotModule } from '../bot/bot.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { StockAlertService } from './stock-alert.service';

@Module({
  imports: [PrismaModule, forwardRef(() => BotModule)],
  controllers: [ProductsController],
  providers: [ProductsService, StockAlertService],
  exports: [ProductsService, StockAlertService],
})
export class ProductsModule {}
