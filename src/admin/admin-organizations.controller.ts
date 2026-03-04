import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { AdminService } from './admin.service';
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
  create(@Body() dto: AdminCreateOrganizationDto) {
    return this.adminService.createOrganization(dto);
  }

  @Get()
  list(@Query() pagination?: PaginationDto) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    return this.adminService.getOrganizations(page, limit);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.adminService.getOrganizationById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: AdminUpdateOrganizationDto) {
    return this.adminService.updateOrganization(id, dto);
  }

  @Post(':orgId/vehicles')
  createVehicle(
    @Param('orgId') orgId: string,
    @Body() dto: AdminCreateVehicleDto,
  ) {
    return this.adminService.createVehicle(orgId, dto);
  }

  @Get(':orgId/vehicles')
  listVehicles(
    @Param('orgId') orgId: string,
    @Query() pagination?: PaginationDto,
  ) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 50;
    return this.adminService.getVehiclesByOrg(orgId, page, limit);
  }
}
