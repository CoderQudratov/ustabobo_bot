import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TelegramWebAppGuard,
  TelegramWebAppUser,
} from './telegram-webapp.guard';

const AUTH_HEADER = 'authorization';
const BEARER_PREFIX = 'bearer ';

@Injectable()
export class WebAppOrJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly telegramWebAppGuard: TelegramWebAppGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers[AUTH_HEADER];
    const token =
      typeof authHeader === 'string' &&
      authHeader.toLowerCase().startsWith(BEARER_PREFIX)
        ? authHeader.slice(BEARER_PREFIX.length).trim()
        : null;

    if (token) {
      try {
        const payload = this.jwtService.verify<JwtPayload>(token);
        if (!payload?.sub) throw new UnauthorizedException();
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub, is_active: true },
        });
        if (!user) throw new UnauthorizedException();
        const telegramId = user.tg_id ? parseInt(user.tg_id, 10) : 0;
        (request as Request & { user: TelegramWebAppUser }).user = {
          id: user.id,
          telegramId: Number.isFinite(telegramId) ? telegramId : 0,
          authDate: 0,
          login: user.login,
          role: user.role,
          fullname: user.fullname,
        };
        return true;
      } catch {
        // Fall through to initData
      }
    }

    return this.telegramWebAppGuard.canActivate(context);
  }
}
