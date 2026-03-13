import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { AdminService, AdminRequestUser } from './admin.service';

@Controller('admin/masters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.boss)
export class AdminMastersController {
  constructor(private readonly adminService: AdminService) {}

  /** Ustalar ro'yxati (role=master) */
  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Req() req?: Request & { user: AdminRequestUser },
  ) {
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(String(limit), 10) || 20),
    );
    return this.adminService.getUsers(
      { role: 'master' },
      pageNum,
      limitNum,
      req?.user,
    );
  }

  /** Usta hisoboti: sana oralig'idagi tugallangan buyurtmalar + summary */
  @Get(':id/report')
  getReport(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    if (!from || !to) {
      throw new BadRequestException(
        'from va to parametrlari kerak (YYYY-MM-DD yoki ISO)',
      );
    }
    return this.adminService.getMasterReport(id, from, to, req.user);
  }
}
