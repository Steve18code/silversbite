import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { logger } from '../config/logger';

const r2Env = env as typeof env & {
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
};

const isConfigured = Boolean(
  r2Env.R2_ACCOUNT_ID &&
  r2Env.R2_ACCESS_KEY_ID &&
  r2Env.R2_SECRET_ACCESS_KEY &&
  r2Env.R2_BUCKET_NAME,
);

const client = isConfigured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${r2Env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2Env.R2_ACCESS_KEY_ID!,
        secretAccessKey: r2Env.R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

let warnedOnce = false;

export async function uploadMedia(
  buffer: Buffer,
  mimeType: string,
  keyPrefix: string,
): Promise<string | null> {
  if (!client) {
    if (!warnedOnce) {
      logger.warn(
        'R2 storage not configured — media will not be persisted, only processed in-memory.',
      );
      warnedOnce = true;
    }
    return null;
  }

  const key = `${keyPrefix}/${randomUUID()}`;

  await client.send(
    new PutObjectCommand({
      Bucket: r2Env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  return key;
}
