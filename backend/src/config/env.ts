declare const require: any;
const dotenv = require('dotenv') as any;
dotenv.config();
// Avoid relying on Node types being present in the TS config by accessing
// the global process at runtime with a loose any cast.
const proc = (globalThis as any).process as any;
import { z } from 'zod';

/**
 * Only variables required for the CURRENT gate are marked required.
 * As later gates land (WhatsApp, AI, payments), move their keys from
 * `.optional()` to required here — that's how we keep "fail fast on boot"
 * honest instead of demanding secrets for features that don't exist yet.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().optional(), // required from Gate 3 onward
  REDIS_URL: z.string().optional(), // required from Gate 2 onward

  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),

  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  /*
  GOOGLE_CLOUD_PROJECT_ID: z.string().min(1, 'GOOGLE_CLOUD_PROJECT_ID is required from Gate 5 onward'),
  GOOGLE_CLOUD_CREDENTIALS_JSON: z
    .string()
    .min(1, 'GOOGLE_CLOUD_CREDENTIALS_JSON is required from Gate 5 onward')
    .refine((val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    }, 'GOOGLE_CLOUD_CREDENTIALS_JSON must be valid JSON (the full service account key, as one line)'),
    */

  PAYSTACK_SECRET_KEY: z.string().optional(),
  FLUTTERWAVE_SECRET_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(proc.env);

if (!parsed.success) {
  // Log via globalThis to avoid relying on the ambient `console` identifier
  (globalThis as any).console?.error?.(
    '❌ Invalid environment configuration:',
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
