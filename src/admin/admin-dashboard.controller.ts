import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { AdminService } from './admin.service';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.boss)
export class AdminDashboardController {
  constructor(
    private readonly adminService: AdminService,
    private readonly dashboardService: AdminDashboardService,
  ) {}

  @Get('dashboard/weekly-orders')
  getWeeklyOrders() {
    return this.dashboardService.getWeeklyOrders();
  }

  @Get('dashboard/weekly-revenue')
  getWeeklyRevenue() {
    return this.dashboardService.getWeeklyRevenue();
  }

  @Get('dashboard/order-status-counts')
  getOrderStatusCounts() {
    return this.dashboardService.getOrderStatusCounts();
  }

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }
}
