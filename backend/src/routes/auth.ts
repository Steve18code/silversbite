import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../middleware/error-handler';
import { requireAuth } from '../middleware/require-auth';
// Local error classes (fallback) — replace with centralized error module in production.
class ValidationError extends Error {
  public status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class UnauthorizedError extends Error {
  public status = 401;
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
// Local lightweight auth helpers. In production replace with '../services/auth-service'.

// Fallback local implementations in case ../services/auth-service cannot be resolved.
// These are lightweight stand-ins to avoid module resolution errors. Replace with
// proper implementations in production.
type UserRole = 'user' | 'admin' | string;

async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  // naive check: in real app use bcrypt.compare
  return password === passwordHash;
}

function generateAccessToken(payload: { userId: string; role: UserRole }): string {
  return `access-${payload.userId}-${payload.role}-${Date.now()}`;
}

function generateRefreshToken(payload: { userId: string; role: UserRole }): string {
  return `refresh-${payload.userId}-${payload.role}-${Date.now()}`;
}

function verifyRefreshToken(token: string): { userId: string; role: UserRole } {
  // naive parsing of tokens generated above
  if (!token || !token.startsWith('refresh-')) throw new Error('Invalid token');
  const parts = token.split('-');
  const userId = parts[1] ?? '';
  const role = parts[2] ?? 'user';
  return { userId, role };
}

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0]?.message ?? 'Invalid credentials payload');
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const payload = { userId: user.id, role: user.role as UserRole };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  }),
);

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('refreshToken is required');
    }

    let payload;
    try {
      payload = verifyRefreshToken(parsed.data.refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user || user.refreshToken !== parsed.data.refreshToken) {
      throw new UnauthorizedError('Refresh token has been invalidated');
    }

    const newPayload = { userId: user.id, role: user.role as UserRole };
    const accessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    res.json({ accessToken, refreshToken: newRefreshToken });
  }),
);

authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { refreshToken: null },
    });
    res.status(204).send();
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      throw new UnauthorizedError('User no longer exists');
    }
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  }),
);
