import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';

// Express normalizes headers to lowercase
const INIT_DATA_HEADER = 'x-telegram-init-data';

export interface TelegramWebAppUser {
  id: string;
  login: string;
  role: string;
  fullname: string;
}

@Injectable()
export class TelegramWebAppGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if ((context.getType() as string) === 'telegraf') {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const initData = request.headers[INIT_DATA_HEADER];
    const raw =
      typeof initData === 'string'
        ? initData
        : Array.isArray(initData)
          ? initData[0]
          : undefined;
    if (!raw?.trim()) {
      throw new UnauthorizedException(
        'X-Telegram-Init-Data header is required. Open the app from Telegram.',
      );
    }
    const { tgId } = this.authService.validateTelegramInitData(raw);
    const user = await this.authService.getMasterByTgId(tgId);
    (request as Request & { user: TelegramWebAppUser }).user = {
      id: user.id,
      login: user.login,
      role: user.role,
      fullname: user.fullname,
    };
    return true;
  }
}
