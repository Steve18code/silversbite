import { Worker } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis';
import { logger } from '../config/logger';
import { QUEUE_NAMES } from './queue-names';
import { processTestJob } from './processors/test-processor';
import { processWhatsAppInbound } from './processors/whatsapp-inbound-processor';

/**
 * Starts one BullMQ Worker per queue. Called once from the process entrypoint
 * (see src/worker.ts). Kept separate from the HTTP server (src/index.ts) so
 * the API and the job workers can be scaled/deployed independently later.
 */
export function startWorkers(): Worker[] {
  const testWorker = new Worker(QUEUE_NAMES.TEST, processTestJob, {
    connection: getRedisConnectionOptions(),
  });

  const whatsappInboundWorker = new Worker(QUEUE_NAMES.WHATSAPP_INBOUND, processWhatsAppInbound, {
    connection: getRedisConnectionOptions(),
    concurrency: 5,
  });

  const workers = [testWorker, whatsappInboundWorker];

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
