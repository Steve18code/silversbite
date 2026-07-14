import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis';
import type { QueueName } from './queue-names';

const queues = new Map<QueueName, Queue>();

/**
 * Returns a singleton Queue instance per name, so different parts of the
 * app (e.g. a webhook route and a scheduled job) share one queue object
 * instead of each creating its own Redis connection.
 */
export function getQueue(name: QueueName): Queue {
  const existing = queues.get(name);
  if (existing) return existing;

  const queue = new Queue(name, {
    connection: getRedisConnectionOptions(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 3600 }, // keep completed jobs for 1hr for debugging
      removeOnFail: { age: 86400 }, // keep failed jobs for 24hr
    },
  });

  queues.set(name, queue);
  return queue;
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all(Array.from(queues.values()).map((q) => q.close()));
}
