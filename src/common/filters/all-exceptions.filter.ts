import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof Error ? exception.message : 'Internal error';
    const stack = exception instanceof Error ? exception.stack : undefined;

    console.error('[AllExceptionsFilter] UNHANDLED EXCEPTION:', exception);
    if (stack) console.error('[AllExceptionsFilter] stack:', stack);

    let responseBody: Record<string, unknown>;
    if (isHttpException) {
      const body = exception.getResponse();
      responseBody =
        typeof body === 'object' && body !== null
          ? (body as Record<string, unknown>)
          : { statusCode: status, message };
      if (status === 401) {
        responseBody = {
          ok: false,
          statusCode: 401,
          error: 'Unauthorized',
          message:
            (responseBody.message as string) ||
            'Invalid Telegram init data signature',
        };
      }
    } else {
      responseBody = { statusCode: status, message };
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, status);
  }
}
