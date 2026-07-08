import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Every request gets a correlation ID — either reused from an incoming
 * `x-request-id` header (useful when a load balancer/gateway already sets one)
 * or freshly generated. It's attached to the request object and echoed back
 * in the response header so a customer-reported issue can be traced through
 * logs by this ID alone.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  req.requestId = incoming && incoming.length > 0 ? incoming : randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
}
