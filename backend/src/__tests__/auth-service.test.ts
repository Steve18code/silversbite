import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../services/auth-services';

describe('auth-service: password hashing', () => {
  it('hashes a password and verifies the correct password against it', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(hash).not.toBe('correct-horse-battery-staple');
    await expect(verifyPassword('correct-horse-battery-staple', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password against a real hash', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('produces a different hash each time (salted)', async () => {
    const hash1 = await hashPassword('same-password');
    const hash2 = await hashPassword('same-password');
    expect(hash1).not.toBe(hash2);
  });
});

describe('auth-service: JWT tokens', () => {
  it('generates and verifies a valid access token', () => {
    const token = generateAccessToken({ userId: 'user_123', role: 'OWNER' });
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe('user_123');
    expect(decoded.role).toBe('OWNER');
  });

  it('generates and verifies a valid refresh token', () => {
    const token = generateRefreshToken({ userId: 'user_456', role: 'STAFF' });
    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe('user_456');
    expect(decoded.role).toBe('STAFF');
  });

  it('rejects an access token verified as a refresh token (different secrets)', () => {
    const accessToken = generateAccessToken({ userId: 'user_789', role: 'OWNER' });
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });

  it('rejects a garbage token', () => {
    expect(() => verifyAccessToken('not-a-real-token')).toThrow();
  });
});
