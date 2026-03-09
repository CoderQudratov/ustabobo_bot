import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { AdminTenantsService } from './admin-tenants.service';
import { CreateTenantDto, ExtendPlanDto } from './dto/create-tenant.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/tenants')
export class AdminTenantsController {
  constructor(private readonly service: AdminTenantsService) {}

  @Get('stats')
  getStats() {
    return this.service.getDashboardStats();
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/toggle-block')
  toggleBlock(@Param('id') id: string) {
    return this.service.toggleBlock(id);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.service.toggleActive(id);
  }

  @Patch(':id/extend')
  extendPlan(@Param('id') id: string, @Body() dto: ExtendPlanDto) {
    return this.service.extendPlan(id, dto);
  }
}
