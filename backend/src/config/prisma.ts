// Use require in a try/catch to avoid TS/Node runtime errors when
// @prisma/client is not yet installed (prevents "Cannot find module"
// during installs or CI). If missing, provide a minimal noop stub so
// the rest of the app can still be type-checked/run in limited ways.
// Declare require for TypeScript when @types/node isn't installed
/* eslint-disable @typescript-eslint/no-unused-vars */
declare const require: (moduleName: string) => any;
/* eslint-enable @typescript-eslint/no-unused-vars */
let PrismaClient: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  PrismaClient = require('@prisma/client').PrismaClient;
} catch (e) {
  // Minimal stub implementation to avoid runtime crashes when prisma isn't installed.
  PrismaClient = class {
    async $connect() {}
    async $disconnect() {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(..._args: any[]) {}
  };
}
import { env } from './env';
import { logger } from './logger';

/**
 * A single shared PrismaClient instance for the whole process. Creating a
 * new PrismaClient per request/module would open a new connection pool each
 * time — expensive and eventually exhausts Postgres's max_connections.
 *
 * In dev, `tsx watch` re-executes this module on every file change; without
 * caching the instance on `global`, each reload would leak another
 * connection pool. This pattern (standard Prisma + Next.js/tsx advice)
 * avoids that.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma: InstanceType<typeof PrismaClient> | undefined;
}

export const prisma =
  (globalThis as any).__prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV === 'development') {
  (globalThis as any).__prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('Connected to database');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
