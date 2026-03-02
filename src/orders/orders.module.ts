import { Module, forwardRef } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { DriverOrdersController } from './driver-orders.controller';
import { CustomerController } from './customer.controller';
import { OrdersService } from './orders.service';
import { BroadcastModule } from '../broadcast/broadcast.module';
import { AuthModule } from '../auth/auth.module';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [BroadcastModule, AuthModule, forwardRef(() => BotModule)],
  controllers: [
    OrdersController,
    DriverOrdersController,
    CustomerController,
  ],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
