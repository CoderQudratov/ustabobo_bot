import {
  Body,
  Controller,
  Delete,
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
import { AdminCreateServiceDto } from './dto/create-service.dto';
import { AdminUpdateServiceDto } from './dto/update-service.dto';
import { PaginationDto } from './dto/pagination.dto';

@Controller('admin/services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.boss)
export class AdminServicesController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  create(@Body() dto: AdminCreateServiceDto) {
    return this.adminService.createService(dto);
  }

  @Get()
  list(@Query() pagination?: PaginationDto) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 50;
    return this.adminService.getServices(page, limit);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: AdminUpdateServiceDto) {
    return this.adminService.updateService(id, dto);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.adminService.toggleServiceActive(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.adminService.deleteService(id);
  }
}
