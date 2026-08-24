/**
 * Phase 2 — Global exception handling.
 *
 * Converts every unhandled error into a consistent JSON response, logs it in
 * structured form with the request correlation id, and never leaks stack
 * traces, secrets, or internal details to the client.
 */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { logStructured } from '../logging/structured-logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const res = ctx.getResponse<Response>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Known HTTP exceptions keep their (already safe) response body.
    // Unknown errors are collapsed into a generic message — no internals leak.
    const body = isHttp
      ? exception.getResponse()
      : { statusCode: status, message: 'Internal server error' };

    logStructured(status >= 500 ? 'error' : 'warn', 'request_failed', {
      requestId: req?.requestId,
      method: req?.method,
      path: req?.originalUrl ?? req?.url,
      status,
      // Only the error *type* and message are logged for unknown errors; never the stack.
      error: isHttp ? exception.name : (exception as Error)?.name ?? 'UnknownError',
      detail: isHttp ? undefined : (exception as Error)?.message,
    });

    if (res.headersSent) return;

    res
      .status(status)
      .json(
        typeof body === 'string'
          ? { statusCode: status, message: body, requestId: req?.requestId }
          : { ...(body as Record<string, unknown>), requestId: req?.requestId },
      );
  }
}
