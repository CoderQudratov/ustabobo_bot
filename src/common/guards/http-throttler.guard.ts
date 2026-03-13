import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Custom ThrottlerGuard that only runs for HTTP context.
 * Prevents HTTP-specific logic (res.header(), req.headers) from running in Telegraf
 * execution context, avoiding "res.header is not a function" and similar crashes.
 *
 * - If context.getType() !== 'http', bypass rate-limiting entirely (return true).
 * - Overrides both canActivate and handleRequest so no Express methods are ever
 *   called on a Telegraf context.
 */
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  private static isHttpContext(context: ExecutionContext): boolean {
    return String(context.getType()) === 'http';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!HttpThrottlerGuard.isHttpContext(context)) {
      return true;
    }
    try {
      const http = context.switchToHttp();
      const req = http.getRequest();
      const res = http.getResponse();
      if (!req?.headers || typeof res?.status !== 'function' || typeof res?.header !== 'function') {
        return true;
      }
    } catch {
      return true;
    }
    return super.canActivate(context);
  }

  /**
   * Override so that handleRequest (which calls res.header()) is never run
   * in a non-HTTP context. Parent's canActivate calls this for each throttler.
   */
  protected override async handleRequest(
    requestProps: Parameters<ThrottlerGuard['handleRequest']>[0],
  ): Promise<boolean> {
    const { context } = requestProps;
    if (!HttpThrottlerGuard.isHttpContext(context)) {
      return true;
    }
    return super.handleRequest(requestProps);
  }
}
