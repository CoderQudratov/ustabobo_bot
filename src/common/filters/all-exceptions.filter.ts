import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request } from 'express';
import {
  buildErrorResponse,
  ERROR_CODES,
  type ErrorResponseDto,
} from '../dto/error-response.dto';

const REQUEST_ID_HEADER = 'x-request-id';
const FALLBACK_REQUEST_ID = 'telegram-bot';

function getRequestId(request: Request | undefined): string {
  try {
    const id = request?.headers?.[REQUEST_ID_HEADER];
    if (typeof id === 'string' && id.trim()) return id.trim();
    if (!request?.headers) return FALLBACK_REQUEST_ID;
    return crypto.randomUUID();
  } catch {
    return FALLBACK_REQUEST_ID;
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    let requestId = FALLBACK_REQUEST_ID;
    let ctx: ReturnType<ArgumentsHost['switchToHttp']>;
    try {
      ctx = host.switchToHttp();
      const request = ctx.getRequest<Request>();
      requestId = getRequestId(request);
    } catch {
      ctx = null as unknown as ReturnType<ArgumentsHost['switchToHttp']>;
    }

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const stack = exception instanceof Error ? exception.stack : undefined;

    let message: string;
    let details: Record<string, unknown> | undefined;
    let code = ERROR_CODES[status] ?? 'INTERNAL_ERROR';

    if (isHttpException) {
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        if (typeof b.code === 'string' && b.code.trim()) {
          code = b.code.trim();
        }
        const msg = b.message;
        message = Array.isArray(msg)
          ? ((msg[0] as string) ?? exception.message)
          : ((typeof msg === 'string' ? msg : exception.message) ??
            exception.message);
        if (status === 401) {
          message = message || 'Tizimga kiring';
        }
        if (status === 403) {
          message = message || "Ruxsat yo'q. Tizimga qayta kiring.";
        }
        if (b.details && typeof b.details === 'object') {
          details = b.details as Record<string, unknown>;
        } else if (Array.isArray(b.message) && b.message.length > 1) {
          details = { validationErrors: b.message };
        }
      } else {
        message =
          (typeof body === 'string' ? body : exception.message) ??
          'Internal error';
      }
    } else {
      message =
        exception instanceof Error ? exception.message : 'Internal error';
      if (process.env.NODE_ENV !== 'production' && stack) {
        details = { stack };
      }
    }

    const isTest = process.env.NODE_ENV === 'test';
    if (!isTest || status >= 500) {
      console.error(
        `[AllExceptionsFilter] ${code} requestId=${requestId} status=${status}`,
        message,
      );
    }
    if (stack && process.env.NODE_ENV !== 'production' && !isTest) {
      console.error('[AllExceptionsFilter] stack:', stack);
    }

    const responseBody: ErrorResponseDto = buildErrorResponse(
      code,
      message,
      requestId,
      details,
    );

    if (ctx) {
      try {
        const response = ctx.getResponse();
        const isExpressResponse =
          response &&
          typeof (response as { status?: unknown }).status === 'function' &&
          typeof (response as { header?: unknown }).header === 'function';
        if (isExpressResponse) {
          httpAdapter.reply(response, responseBody, status);
        }
      } catch {
        // Not an HTTP context (e.g. Telegram bot), response already sent or invalid
      }
    }
  }
}
