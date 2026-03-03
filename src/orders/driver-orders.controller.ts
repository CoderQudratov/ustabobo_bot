import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';

interface JwtUser {
  id: string;
  login: string;
  role: Role;
  fullname: string;
}

@Controller('driver/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.driver)
export class DriverOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post(':id/accept')
  accept(@Param('id') id: string, @Req() req: Request & { user: JwtUser }) {
    const driverId = req.user.id;
    return this.ordersService.driverAccept(id, driverId);
  }

  @Post(':id/delivered')
  delivered(@Param('id') id: string, @Req() req: Request & { user: JwtUser }) {
    const driverId = req.user.id;
    return this.ordersService.driverDelivered(id, driverId);
  }
}
