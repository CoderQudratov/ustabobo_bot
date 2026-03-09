import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { AdminService } from './admin.service';
import { AdminDashboardService, AdminDashboardRequestUser } from './admin-dashboard.service';
import type { AdminRequestUser } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.boss)
export class AdminDashboardController {
  constructor(
    private readonly adminService: AdminService,
    private readonly dashboardService: AdminDashboardService,
  ) {}

  @Get('dashboard/weekly-orders')
  getWeeklyOrders(@Req() req: Request & { user: AdminDashboardRequestUser & AdminRequestUser }) {
    return this.dashboardService.getWeeklyOrders(req.user);
  }

  @Get('dashboard/weekly-revenue')
  getWeeklyRevenue(@Req() req: Request & { user: AdminDashboardRequestUser & AdminRequestUser }) {
    return this.dashboardService.getWeeklyRevenue(req.user);
  }

  @Get('dashboard/order-status-counts')
  getOrderStatusCounts(@Req() req: Request & { user: AdminDashboardRequestUser & AdminRequestUser }) {
    return this.dashboardService.getOrderStatusCounts(req.user);
  }

  @Get('dashboard')
  getDashboard(@Req() req: Request & { user: AdminRequestUser }) {
    return this.adminService.getDashboard(req.user);
  }
}
