import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../middleware/error-handler';
import { requireAuth } from '../middleware/require-auth';
import { UnauthorizedError, ValidationError } from '../errors/app-error';
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  type UserRole,
} from '../services/auth-service';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/auth/login { email, password }
 * Returns a short-lived access token and a longer-lived refresh token.
 * The refresh token is stored on the User record so it can be invalidated
 * on logout (a stateless-only JWT refresh scheme can't be revoked early).
 */
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0]?.message ?? 'Invalid credentials payload');
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    // Same error for "no such user" and "wrong password" — don't leak which
    // one it was, that tells an attacker whether an email is registered.
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

/**
 * POST /api/auth/refresh { refreshToken }
 * Exchanges a valid, still-active refresh token for a new access token.
 * Also rotates the refresh token (issues a new one, invalidates the old)
 * to limit the damage window if a refresh token ever leaks.
 */
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

    // The token must match what's currently stored — if it was already
    // rotated or the user logged out, this stops an old leaked token from
    // still working even though its signature/expiry are technically valid.
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

/**
 * POST /api/auth/logout
 * Requires a valid access token. Clears the stored refresh token so it can
 * no longer be exchanged — this is what makes logout actually mean something
 * rather than just "the client forgot the token."
 */
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

/**
 * GET /api/auth/me
 * Handy for the dashboard to check "am I still logged in" and get current
 * user info on page load, without re-sending credentials.
 */
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
