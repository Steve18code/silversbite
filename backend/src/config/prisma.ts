import { PrismaClient } from '@prisma/client';
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
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV === 'development') {
  global.__prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('Connected to database');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
