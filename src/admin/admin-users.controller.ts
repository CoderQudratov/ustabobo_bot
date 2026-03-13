import {
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
import { AdminCreateUserDto } from './dto/create-user.dto';
import { AdminUpdateUserDto } from './dto/update-user.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.boss)
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  create(
    @Body() dto: AdminCreateUserDto,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.createUser(dto, req.user);
  }

  @Get()
  list(
    @Query('role') role?: string,
    @Query('is_active') is_active?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request & { user: AdminRequestUser },
  ) {
    const isActive =
      is_active === undefined
        ? undefined
        : is_active === 'true'
          ? true
          : is_active === 'false'
            ? false
            : undefined;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(String(limit), 10) || 20),
    );
    return this.adminService.getUsers(
      { role, is_active: isActive },
      pageNum,
      limitNum,
      req?.user,
    );
  }

  @Get(':id')
  getOne(
    @Param('id') id: string,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.getUserById(id, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.updateUser(id, dto, req.user);
  }

  @Patch(':id/toggle-active')
  toggleActive(
    @Param('id') id: string,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.toggleUserActive(id, req.user?.id, req.user);
  }
}
