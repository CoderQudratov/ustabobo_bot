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
import { AdminCreateUserDto } from './dto/create-user.dto';
import { AdminUpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from './dto/pagination.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.boss)
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  create(@Body() dto: AdminCreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Get()
  list(
    @Query('role') role?: string,
    @Query('is_active') is_active?: string,
    @Query() pagination?: PaginationDto,
  ) {
    const isActive =
      is_active === undefined
        ? undefined
        : is_active === 'true'
          ? true
          : is_active === 'false'
            ? false
            : undefined;
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    return this.adminService.getUsers(
      { role, is_active: isActive },
      page,
      limit,
    );
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.adminService.toggleUserActive(id);
  }
}
