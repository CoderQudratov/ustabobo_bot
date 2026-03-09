import {
  Body,
  Controller,
  Delete,
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
import { AdminCreateServiceDto } from './dto/create-service.dto';
import { AdminUpdateServiceDto } from './dto/update-service.dto';
import { PaginationDto } from './dto/pagination.dto';

@Controller('admin/services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.boss)
export class AdminServicesController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  create(
    @Body() dto: AdminCreateServiceDto,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.createService(dto, req.user);
  }

  @Get()
  list(
    @Query() pagination?: PaginationDto,
    @Req() req?: Request & { user: AdminRequestUser },
  ) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 50;
    return this.adminService.getServices(page, limit, req?.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: AdminUpdateServiceDto,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.updateService(id, dto, req.user);
  }

  @Patch(':id/toggle-active')
  toggleActive(
    @Param('id') id: string,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.toggleServiceActive(id, req.user);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: Request & { user: AdminRequestUser }) {
    return this.adminService.deleteService(id, req.user);
  }
}
