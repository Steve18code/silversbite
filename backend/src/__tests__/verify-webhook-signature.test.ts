import { computeSignature, verifySignature } from '../utils/verify-webhook-signature';

describe('verifySignature', () => {
  const secret = 'mysecret';
  const body = JSON.stringify({ hello: 'world' });

  it('returns true for valid signature', () => {
    const sig = computeSignature(body, secret);
    expect(verifySignature(body, sig, secret)).toBe(true);
  });

  it('returns false for invalid signature', () => {
    const bad = 'sha256=deadbeef';
    expect(verifySignature(body, bad, secret)).toBe(false);
  });
});
