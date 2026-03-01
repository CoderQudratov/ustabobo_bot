import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { LocationDto } from './dto/location.dto';
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

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.master, Role.boss)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createDraft(@Req() req: Request & { user: JwtUser }, @Body() dto: CreateOrderDto) {
    const masterId = req.user.id;
    return this.ordersService.createDraft(masterId, dto);
  }

  @Post(':id/location')
  setLocation(
    @Param('id') id: string,
    @Req() req: Request & { user: JwtUser },
    @Body() dto: LocationDto,
  ) {
    return this.ordersService.setLocation(id, req.user.id, dto);
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Req() req: Request & { user: JwtUser }) {
    return this.ordersService.confirm(id, req.user.id);
  }

  @Post(':id/finish')
  finish(@Param('id') id: string, @Req() req: Request & { user: JwtUser }) {
    return this.ordersService.finish(id, req.user.id);
  }

  @Post(':id/receive')
  receive(@Param('id') id: string, @Req() req: Request & { user: JwtUser }) {
    return this.ordersService.receive(id, req.user.id);
  }
}
