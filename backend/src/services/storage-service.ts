import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { logger } from '../config/logger';

const isConfigured = Boolean(
  env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME,
);

const client = isConfigured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

let warnedOnce = false;

/**
 * Uploads a buffer to R2 and returns a key you can later resolve to a URL
 * (via a public bucket URL or signed URL, depending on how R2 is set up).
 *
 * Returns `null` if R2 isn't configured, rather than throwing — voice-note
 * transcription and text messaging both work fine without R2 wired up yet;
 * this only becomes required for Gate 8's PDF menu import. Callers should
 * treat a null return as "media wasn't persisted" and proceed anyway.
 */
export async function uploadMedia(
  buffer: Buffer,
  mimeType: string,
  keyPrefix: string,
): Promise<string | null> {
  if (!client) {
    if (!warnedOnce) {
      logger.warn(
        'R2 storage not configured (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME) — media will not be persisted, only processed in-memory.',
      );
      warnedOnce = true;
    }
    return null;
  }

  const key = `${keyPrefix}/${randomUUID()}`;

  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  return key;
}
