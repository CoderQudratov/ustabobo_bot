import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { DriverOrdersController } from './driver-orders.controller';
import { CustomerController } from './customer.controller';
import { OrdersService } from './orders.service';

@Module({
  controllers: [
    OrdersController,
    DriverOrdersController,
    CustomerController,
  ],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
