import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../config/env';

export function verifyWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const expectedSignature = signatureHeader.slice('sha256='.length);

  const appSecret = env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    return false;
  }

  const computedSignature = createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const computedBuffer = Buffer.from(computedSignature, 'hex');

  if (expectedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, computedBuffer);
}
