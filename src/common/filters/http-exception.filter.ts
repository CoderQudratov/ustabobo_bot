import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

/** Ensures 401 responses from /webapp/init and other auth endpoints have consistent JSON shape. */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? (body as { message: string | string[] }).message
        : exception.message;
    const msg = Array.isArray(message) ? message[0] : message;

    if (status === 401) {
      res.status(401).json({
        ok: false,
        statusCode: 401,
        error: 'Unauthorized',
        message: msg || 'Invalid Telegram init data signature',
      });
      return;
    }

    res.status(status).json(
      typeof body === 'object' && body !== null
        ? body
        : { statusCode: status, message: msg },
    );
  }
}
