// WARNING: Debug endpoint — boss only, disable in production
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface JwtUser {
  id: string;
  login: string;
  role: Role;
  fullname: string;
}

/**
 * Debug endpoints: whoami, initdata/check. Boss-only (JWT). Disable in production.
 */
@Controller('debug')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.boss)
export class DebugController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('whoami')
  async whoami(@Req() req: Request & { user: JwtUser }) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { tg_id: true, role: true, is_authenticated: true },
    });
    if (!user) {
      return { error: 'User not found' };
    }
    return {
      tg_id: user.tg_id,
      role: user.role,
      is_authenticated: user.is_authenticated,
    };
  }

  /**
   * DEV: initData check (auth_date_age_sec etc). Boss-only. Disable in production.
   */
  @Get('initdata/check')
  async initDataCheck(@Req() req: Request & { user: JwtUser }) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        tg_id: true,
        role: true,
        is_authenticated: true,
        username: true,
      },
    });
    if (!user) {
      return { error: 'User not found' };
    }
    return {
      tg_id: user.tg_id,
      username: user.username ?? null,
      is_authenticated: user.is_authenticated,
      role: user.role,
    };
  }
}
