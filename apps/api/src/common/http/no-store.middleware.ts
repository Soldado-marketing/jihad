/**
 * J07 — applies the no-store default to every response (see ./no-store.ts).
 * Nothing here inspects the request or the body.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { applyNoStoreDefault } from './no-store';

@Injectable()
export class NoStoreMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction): void {
    applyNoStoreDefault(res);
    next();
  }
}
