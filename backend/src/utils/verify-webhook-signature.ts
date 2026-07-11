import { createHmac } from 'crypto';
import { env } from '../config/env';

export function verifyWebhookSignature(body: Buffer, signature: string | undefined): boolean {
  if (!signature) {
    return false;
  }

  const [algorithm, hash] = signature.split('=');

  if (algorithm !== 'sha256' || !hash) {
    return false;
  }

  const expectedHash = createHmac('sha256', env.WHATSAPP_APP_SECRET).update(body).digest('hex');

  return hash === expectedHash;
}
