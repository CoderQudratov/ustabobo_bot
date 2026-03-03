import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { TelegramWebAppGuard } from './telegram-webapp.guard';

const INIT_DATA_HEADER = 'x-telegram-init-data';

async function toPromise(
  result: boolean | Promise<boolean> | import('rxjs').Observable<boolean>,
): Promise<boolean> {
  if (typeof result === 'boolean') return result;
  if (typeof (result as Promise<boolean>).then === 'function')
    return result as Promise<boolean>;
  return firstValueFrom(result as import('rxjs').Observable<boolean>);
}

@Injectable()
export class MasterAuthGuard implements CanActivate {
  constructor(
    private readonly jwtGuard: JwtAuthGuard,
    private readonly telegramGuard: TelegramWebAppGuard,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method === 'OPTIONS') return true;
    if ((context.getType() as string) === 'telegraf') {
      return true;
    }
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isPublic) {
      return toPromise(this.jwtGuard.canActivate(context));
    }
    const bearer = request.headers.authorization;
    if (bearer?.startsWith('Bearer ')) {
      return toPromise(this.jwtGuard.canActivate(context));
    }
    const initData = request.headers[INIT_DATA_HEADER];
    const raw =
      typeof initData === 'string'
        ? initData
        : Array.isArray(initData)
          ? initData[0]
          : undefined;
    const hasInitData = !!raw?.trim();
    if (hasInitData) {
      return toPromise(this.telegramGuard.canActivate(context));
    }
    throw new UnauthorizedException('Telegram orqali kiring');
  }
}
