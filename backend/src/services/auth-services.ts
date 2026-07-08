const bcrypt = require('bcryptjs');
// @ts-ignore: allow importing jsonwebtoken when type declarations are not installed
const jwt = require('jsonwebtoken');
type SignOptions = {
  expiresIn?: string | number;
};
import { env } from '../config/env';

const JWT_ACCESS_EXPIRY = (env as any).JWT_ACCESS_EXPIRY ?? '15m';
const JWT_REFRESH_EXPIRY = (env as any).JWT_REFRESH_EXPIRY ?? '7d';

export type UserRole = 'OWNER' | 'STAFF';

export interface JwtPayload {
  userId: string;
  role: UserRole;
}

const SALT_ROUNDS = 12;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRY,
  } as SignOptions);
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY,
  } as SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
}
