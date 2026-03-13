import {
  BadRequestException,
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
import { AdminService, AdminRequestUser } from './admin.service';
import { AdminCreateOrganizationDto } from './dto/create-organization.dto';
import { AdminUpdateOrganizationDto } from './dto/update-organization.dto';
import { AdminCreateVehicleDto } from './dto/create-vehicle.dto';
import { PaginationDto } from './dto/pagination.dto';

@Controller('admin/organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.boss)
export class AdminOrganizationsController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  create(
    @Body() dto: AdminCreateOrganizationDto,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.createOrganization(dto, req.user);
  }

  @Get()
  list(
    @Query() pagination?: PaginationDto,
    @Req() req?: Request & { user: AdminRequestUser },
  ) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    return this.adminService.getOrganizations(page, limit, req?.user);
  }

  @Get(':id/report')
  getReport(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    if (!from || !to) {
      throw new BadRequestException(
        'from va to parametrlari kerak (YYYY-MM-DD)',
      );
    }
    return this.adminService.getOrganizationReport(id, from, to, req.user);
  }

  @Get(':id')
  getOne(
    @Param('id') id: string,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.getOrganizationById(id, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: AdminUpdateOrganizationDto,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.updateOrganization(id, dto, req.user);
  }

  @Post(':orgId/vehicles')
  createVehicle(
    @Param('orgId') orgId: string,
    @Body() dto: AdminCreateVehicleDto,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.createVehicle(orgId, dto, req.user);
  }

  @Get(':orgId/vehicles')
  listVehicles(
    @Param('orgId') orgId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Req() req?: Request & { user: AdminRequestUser },
  ) {
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(String(limit), 10) || 50),
    );
    return this.adminService.getVehiclesByOrg(
      orgId,
      pageNum,
      limitNum,
      req?.user,
      search,
    );
  }
}
