import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { AdminService } from './admin.service';
import { AdminUpdateVehicleDto } from './dto/update-vehicle.dto';

@Controller('admin/vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.boss)
export class AdminVehiclesController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  list(
    @Query('org_id') orgId?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllVehicles(orgId, search);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: AdminUpdateVehicleDto) {
    return this.adminService.updateVehicle(id, dto);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.adminService.toggleVehicleActive(id);
  }
}
