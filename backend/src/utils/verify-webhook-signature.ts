import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../config/env';

/**
 * Meta signs every webhook POST body with HMAC-SHA256 using the app secret,
 * sent as `X-Hub-Signature-256: sha256=<hex>`. Without this check, anyone
 * who finds our webhook URL could POST fake orders/menu changes.
 *
 * Must be run against the RAW request body bytes, not the parsed JSON —
 * re-serializing JSON can produce different bytes (key order, spacing) than
 * what Meta actually signed, causing false negatives. See index.ts for how
 * the raw body is captured.
 */
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const expectedSignature = signatureHeader.slice('sha256='.length);

  const computedSignature = createHmac('sha256', env.WHATSAPP_APP_SECRET)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const computedBuffer = Buffer.from(computedSignature, 'hex');

  // Different lengths would throw in timingSafeEqual rather than just
  // returning false, so guard explicitly first.
  if (expectedBuffer.length !== computedBuffer.length) {
    return false;
  }

  // timingSafeEqual (not ===) so response time doesn't leak how many
  // leading bytes matched — a real, if narrow, side-channel otherwise.
  return timingSafeEqual(expectedBuffer, computedBuffer);
}
