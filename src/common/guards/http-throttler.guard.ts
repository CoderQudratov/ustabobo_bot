import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * ThrottlerGuard that only runs for HTTP context.
 * Skips throttling for Telegraf (bot) updates so bot callbacks (e.g. Tasdiqlash/Bekor qilish)
 * don't trigger "req.headers / res.header is not a function" errors.
 */
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (String(context.getType()) === 'telegraf') {
      return true;
    }
    try {
      const http = context.switchToHttp();
      const req = http.getRequest();
      const res = http.getResponse();
      if (!req?.headers || typeof res?.status !== 'function') {
        return true;
      }
    } catch {
      return true;
    }
    return super.canActivate(context);
  }
}
