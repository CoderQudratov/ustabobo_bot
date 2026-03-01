import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { DriverOrdersController } from './driver-orders.controller';
import { CustomerController } from './customer.controller';
import { OrdersService } from './orders.service';
import { BroadcastModule } from '../broadcast/broadcast.module';

@Module({
  imports: [BroadcastModule],
  controllers: [
    OrdersController,
    DriverOrdersController,
    CustomerController,
  ],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
