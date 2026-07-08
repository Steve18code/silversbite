import type { NextFunction, Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

type JwtPayload = {
  role: 'OWNER' | 'STAFF';
  exp?: number;
  [key: string]: unknown;
};

function base64UrlDecode(value: string): string {
  const base64 =
    value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(base64, 'base64').toString('utf8');
}

function verifyAccessToken(token: string): JwtPayload {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error('Missing access token secret');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT structure');
  }

  const [encodedHeader, encodedPayload, encodedSignatureRaw] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignatureRaw) {
    throw new Error('Invalid JWT structure');
  }

  const encodedSignature = encodedSignatureRaw;
  const signatureBase = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac('sha256', secret)
    .update(signatureBase)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (
    expectedSignature.length !== encodedSignature.length ||
    !timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(encodedSignature))
  ) {
    throw new Error('Invalid JWT signature');
  }

  const payloadJson = base64UrlDecode(encodedPayload);
  const payload = JSON.parse(payloadJson);

  if (
    !payload ||
    typeof payload !== 'object' ||
    (payload.role !== 'OWNER' && payload.role !== 'STAFF')
  ) {
    throw new Error('Invalid JWT payload');
  }

  if (typeof payload.exp === 'number' && Date.now() >= payload.exp * 1000) {
    throw new Error('JWT token has expired');
  }

  return payload as JwtPayload;
}

class UnauthorizedError extends Error {
  statusCode = 401;
  status = 401;

  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    Error.captureStackTrace?.(this, UnauthorizedError);
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

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

export function requireRole(...allowedRoles: Array<'OWNER' | 'STAFF'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new UnauthorizedError('Insufficient permissions for this action');
    }
    next();
  };
}
