import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { DriverOrdersController } from './driver-orders.controller';
import { CustomerController } from './customer.controller';
import { OrdersService } from './orders.service';
import { BroadcastModule } from '../broadcast/broadcast.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [BroadcastModule, AuthModule],
  controllers: [
    OrdersController,
    DriverOrdersController,
    CustomerController,
  ],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
