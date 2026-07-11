import { env } from './env';

/**
 * Plain connection options (not a raw IORedis instance) are handed to
 * BullMQ so it manages the actual Redis client using its own bundled
 * `ioredis` dependency internally. Passing our own IORedis instance instead
 * causes a structural type conflict when our top-level `ioredis` version
 * differs from BullMQ's bundled copy — this sidesteps that entirely and
 * lets BullMQ own the connection lifecycle for Queues and Workers.
 */
export function getRedisConnectionOptions() {
  const redisUrl = env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL must be defined');
  }
  const url = new URL(redisUrl);

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    maxRetriesPerRequest: null as null, // required by BullMQ workers
  };
}
