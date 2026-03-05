import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.boss)
export class AdminReportsController {
  constructor(private readonly adminService: AdminService) {}

  @Get('vehicles/:id/history')
  getVehicleHistory(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(String(limit), 10) || 20),
    );
    return this.adminService.getVehicleHistory(id, pageNum, limitNum);
  }

  @Get('clients/history')
  getClientsHistory(
    @Query('phone') phone?: string,
    @Query('car_number') car_number?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(String(limit), 10) || 20),
    );
    return this.adminService.getClientsHistory({
      phone,
      car_number,
      page: pageNum,
      limit: limitNum,
    });
  }

  @Get('reports')
  getReports(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('master_id') master_id?: string,
    @Query('org_id') org_id?: string,
  ) {
    if (!from?.trim() || !to?.trim()) {
      throw new BadRequestException('from and to (ISO date) are required');
    }
    return this.adminService.getReports({ from, to, master_id, org_id });
  }
}
