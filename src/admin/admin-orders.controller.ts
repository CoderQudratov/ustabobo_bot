import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { AdminService } from './admin.service';
import { AdminOrdersQueryDto } from './dto/orders-query.dto';
import { AdminCreateOrderDto } from './dto/create-order.dto';
import { AdminUpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import type { AdminRequestUser } from './admin.service';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.boss)
export class AdminOrdersController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  list(
    @Query() query: AdminOrdersQueryDto,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return this.adminService.getOrders(
      {
        status: query.status,
        from: query.from,
        to: query.to,
        master_id: query.master_id,
        organization_id: query.organization_id,
        search: query.search,
      },
      page,
      limit,
      req.user,
    );
  }

  @Post()
  create(
    @Body() dto: AdminCreateOrderDto,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.createOrder(dto, req.user);
  }

  @Get(':id')
  getOne(
    @Param('id') id: string,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.getOrderById(id, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: AdminUpdateOrderDto,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.updateOrder(id, dto, req.user);
  }

  @Post(':id/recalculate-fees')
  recalculateFees(
    @Param('id') id: string,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.recalculateOrderFees(id, req.user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.updateOrderStatus(id, dto.status, req.user);
  }
}
