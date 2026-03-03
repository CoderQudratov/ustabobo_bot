import { Controller, Param, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('customer')
export class CustomerController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post('confirm/:token')
  confirm(@Param('token') token: string) {
    return this.ordersService.customerConfirm(token);
  }
}
