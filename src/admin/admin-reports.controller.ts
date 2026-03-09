import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ParsePhone } from '../common/decorators/parse-phone.decorator';
import { Role } from '../../generated/prisma/client';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.boss)
export class AdminReportsController {
  constructor(private readonly adminService: AdminService) {}

  @Get('vehicles/by-plate/:plateNumber')
  getVehicleByPlate(@Param('plateNumber') plateNumber: string) {
    return this.adminService.getVehicleByPlate(plateNumber);
  }

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

  @Get('clients/individuals')
  getIndividualClients(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    return this.adminService.getIndividualClients({
      from,
      to,
      status,
      search,
      page: pageNum,
      limit: limitNum,
    });
  }

  @Get('clients/individuals/orders')
  async getClientOrders(
    @ParsePhone() phone: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    console.log('[getClientOrders] Validated phone:', phone, '| from:', from, 'to:', to, 'status:', status);
    try {
      return await this.adminService.getClientOrders(phone, { from, to, status });
    } catch (e) {
      console.error('[getClientOrders] ERROR:', e instanceof Error ? e.message : e, e instanceof Error ? e.stack : '');
      throw e;
    }
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
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('master_id') master_id?: string,
    @Query('org_id') org_id?: string,
  ) {
    const now = new Date();
    const fromDate = from?.trim()
      ? new Date(from)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    let toDate = to?.trim() ? new Date(to) : new Date(now);
    toDate.setHours(23, 59, 59, 999);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException("from va to sanalar noto'g'ri formatda");
    }

    return this.adminService.getReports({
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      master_id,
      org_id,
    });
  }
}
