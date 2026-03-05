import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { AdminService } from './admin.service';
import { AdminOrdersQueryDto } from './dto/orders-query.dto';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.boss)
export class AdminOrdersController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  list(@Query() query: AdminOrdersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return this.adminService.getOrders(
      {
        status: query.status,
        from: query.from,
        to: query.to,
        master_id: query.master_id,
        organization_id: query.organization_id,
      },
      page,
      limit,
    );
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.adminService.getOrderById(id);
  }
}
