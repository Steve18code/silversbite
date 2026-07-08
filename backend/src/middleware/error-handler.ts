import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';

// Local type guard for AppError-like objects. Importing the AppError class
// caused a TS error when the module wasn't present, so we detect by shape
// instead which is sufficient for error handling here.
interface AppErrorLike {
  statusCode: number;
  message: string;
}

function isAppError(err: unknown): err is AppErrorLike {
  return (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof (err as any).statusCode === 'number' &&
    'message' in err &&
    typeof (err as any).message === 'string'
  );
}

/**
 * Catches everything that reaches it — thrown in a route, passed to next(err),
 * or rejected from an async handler wrapped with `asyncHandler` below.
 * Must be the LAST middleware registered in src/index.ts.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (isAppError(err)) {
    logger.warn({ err, requestId: req.requestId }, err.message);
    res.status(err.statusCode).json({
      error: err.message,
      requestId: req.requestId,
    });
    return;
  }

  // Anything else is a bug, not an expected condition — log loudly with a stack trace.
  logger.error({ err, requestId: req.requestId }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.requestId,
  });
}

/**
 * Wraps an async route handler so a rejected promise is forwarded to
 * errorHandler via next(err), instead of crashing the process as an
 * unhandled rejection. Express 5 does this automatically; Express 4 (what
 * we're on) does not, hence this helper.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

/**
 * Catches requests to routes that don't exist. Register this after all real
 * routes but before errorHandler.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    requestId: req.requestId,
  });
}