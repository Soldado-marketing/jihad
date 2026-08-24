/**
 * Phase 2 — Safe request correlation.
 *
 * Assigns every request a correlation id (reusing an inbound x-request-id when
 * it is a safe, short token) and echoes it back on the response so logs and
 * client reports can be tied together. No user data is inspected or logged.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

/** Accept only short, safe inbound ids to avoid log injection / oversized headers. */
const SAFE_ID = /^[A-Za-z0-9._-]{1,64}$/;

export function resolveRequestId(inbound: unknown): string {
  const value = Array.isArray(inbound) ? inbound[0] : inbound;
  if (typeof value === 'string' && SAFE_ID.test(value)) return value;
  return randomUUID();
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
    (req as Request & { requestId?: string }).requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
