import { createHmac } from 'crypto';
import { describe, expect, it, vi } from 'vitest';

// Must mock env BEFORE importing the module under test, since env.ts
// validates process.env at import time.
vi.mock('../config/env', () => ({
  env: { WHATSAPP_APP_SECRET: 'test-app-secret' },
}));

import { verifyWebhookSignature } from '../utils/verify-webhook-signature';

function signBody(body: string, secret: string): string {
  const hmac = createHmac('sha256', secret).update(Buffer.from(body)).digest('hex');
  return `sha256=${hmac}`;
}

describe('verifyWebhookSignature', () => {
  const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });

  it('accepts a correctly signed payload', () => {
    const signature = signBody(body, 'test-app-secret');
    expect(verifyWebhookSignature(Buffer.from(body), signature)).toBe(true);
  });

  it('rejects a payload signed with the wrong secret', () => {
    const signature = signBody(body, 'wrong-secret');
    expect(verifyWebhookSignature(Buffer.from(body), signature)).toBe(false);
  });

  it('rejects a tampered body against a valid signature', () => {
    const signature = signBody(body, 'test-app-secret');
    const tamperedBody = body.replace('whatsapp_business_account', 'something_else');
    expect(verifyWebhookSignature(Buffer.from(tamperedBody), signature)).toBe(false);
  });

  it('rejects a missing signature header', () => {
    expect(verifyWebhookSignature(Buffer.from(body), undefined)).toBe(false);
  });

  it('rejects a malformed signature header (missing sha256= prefix)', () => {
    expect(verifyWebhookSignature(Buffer.from(body), 'not-a-real-signature')).toBe(false);
  });
});
