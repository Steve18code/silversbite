import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * Explicitly resolve the repo-root .env relative to THIS file's location,
 * rather than relying on `dotenv/config`'s default cwd-relative lookup.
 * Without this, running commands from inside backend/ (a very normal thing
 * to do) silently fails to find the root .env and every var looks "missing".
 * This resolves correctly whether running from src/ (tsx) or dist/ (compiled)
 * since both sit at the same depth under backend/.
 */
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Only variables required for the CURRENT gate are marked required.
 * As later gates land (WhatsApp, AI, payments), move their keys from
 * `.optional()` to required here — that's how we keep "fail fast on boot"
 * honest instead of demanding secrets for features that don't exist yet.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required from Gate 3 onward'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required from Gate 2 onward'),

  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required from Gate 4 onward'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required from Gate 4 onward'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  WHATSAPP_PHONE_NUMBER_ID: z
    .string()
    .min(1, 'WHATSAPP_PHONE_NUMBER_ID is required from Gate 5 onward'),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1, 'WHATSAPP_ACCESS_TOKEN is required from Gate 5 onward'),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z
    .string()
    .min(1, 'WHATSAPP_WEBHOOK_VERIFY_TOKEN is required from Gate 5 onward'),
  WHATSAPP_APP_SECRET: z.string().min(1, 'WHATSAPP_APP_SECRET is required from Gate 5 onward'),

  ANTHROPIC_API_KEY: z.string().optional(),

  // Speech-to-text is disabled for now (Gate 5 feature paused). Both
  // Whisper and Google Cloud STT options kept optional so re-enabling
  // either later doesn't require an env-schema change, just uncommenting
  // the transcription call in whatsapp-inbound-processor.ts.
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
  GOOGLE_CLOUD_CREDENTIALS_JSON: z.string().optional(),

  PAYSTACK_SECRET_KEY: z.string().optional(),
  FLUTTERWAVE_SECRET_KEY: z.string().optional(),

  // R2 storage is optional for Gate 5 — voice notes still transcribe fine
  // without it. Gate 8's PDF menu import will make this required.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
