import { Worker } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis';
import { logger } from '../config/logger';
import { QUEUE_NAMES } from './queue-names';
/* eslint-disable @typescript-eslint/no-var-requires */
let processTestJob: any;
try {
  // Try to require the processor. Use require to avoid TS compile-time module resolution
  // errors when the file is missing; fallback to a no-op processor.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('./processors/test-processor');
  processTestJob = mod.processTestJob ?? mod.default ?? mod;
} catch (err) {
  // Fallback processor that does nothing
  processTestJob = async () => {
    /* no-op fallback processor */
  };
}

/**
 * Starts one BullMQ Worker per queue. Called once from the process entrypoint
 * (see src/worker.ts). Kept separate from the HTTP server (src/index.ts) so
 * the API and the job workers can be scaled/deployed independently later.
 */
export function startWorkers(): Worker[] {
  const testWorker = new Worker(QUEUE_NAMES.TEST, processTestJob, {
    connection: getRedisConnectionOptions(),
  });

  const workers = [testWorker];

  for (const worker of workers) {
    worker.on('completed', (job) => {
      logger.info({ queue: worker.name, jobId: job.id }, 'Job completed');
    });
    worker.on('failed', (job, err) => {
      logger.error({ queue: worker.name, jobId: job?.id, err }, 'Job failed');
    });
  }

  return workers;
}
