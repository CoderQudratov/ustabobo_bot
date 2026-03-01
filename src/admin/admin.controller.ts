import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.boss)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('orders')
  getOrders(
    @Query('status') status?: string,
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
  ) {
    return this.adminService.getOrders({ status, from_date, to_date });
  }

  @Get('orders/:id')
  getOrderById(@Param('id') id: string) {
    return this.adminService.getOrderById(id);
  }

  @Get('vehicles/:id/history')
  getVehicleHistory(@Param('id') id: string) {
    return this.adminService.getVehicleHistory(id);
  }

  @Get('clients/history')
  getClientsHistory(
    @Query('phone') phone?: string,
    @Query('car_number') car_number?: string,
  ) {
    return this.adminService.getClientsHistory({ phone, car_number });
  }

  @Get('reports')
  getReports(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('master_id') master_id?: string,
    @Query('org_id') org_id?: string,
  ) {
    return this.adminService.getReports({ from, to, master_id, org_id });
  }
}
