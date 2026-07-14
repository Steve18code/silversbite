import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, type JwtPayload } from '../services/auth-service';
import { UnauthorizedError } from '../errors/app-error';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Protects dashboard API routes. Expects `Authorization: Bearer <token>`.
 * On success, attaches the decoded payload to `req.user` for downstream
 * handlers/middleware (e.g. requireRole) to read.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (!token) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  try {
    req.user = verifyAccessToken(token);
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }

  next();
}

/**
 * Use after requireAuth to restrict a route to specific roles, e.g.
 * router.delete('/menu/:id', requireAuth, requireRole('OWNER'), handler).
 */
export function requireRole(...allowedRoles: Array<'OWNER' | 'STAFF'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new UnauthorizedError('Insufficient permissions for this action');
    }
    next();
  };
}
