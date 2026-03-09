import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

interface JwtUser {
  id: string;
  login: string;
  role: string;
  is_super_admin?: boolean;
  tenant_id?: string | null;
}

@Controller('admin/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.login, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refresh_token') refreshToken: string) {
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new UnauthorizedException('Refresh token required');
    }
    return this.authService.refresh(refreshToken);
  }

  @Get('tenant-status')
  @UseGuards(JwtAuthGuard)
  async getTenantStatus(@Req() req: Request & { user: JwtUser }) {
    if (req.user?.is_super_admin) {
      return { is_blocked: false, days_left: null };
    }

    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      return { is_blocked: true, days_left: 0 };
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return { is_blocked: true, days_left: 0 };
    }

    const now = new Date();
    const daysLeft = tenant.plan_expires
      ? Math.ceil(
          (tenant.plan_expires.getTime() - now.getTime()) / 86400000,
        )
      : null;

    return {
      is_blocked: tenant.is_blocked || !tenant.is_active,
      is_active: tenant.is_active,
      days_left: daysLeft,
      plan_expires: tenant.plan_expires,
      tenant_name: tenant.name,
    };
  }
}
