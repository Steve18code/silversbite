import type { Job } from 'bullmq';
import { logger } from '../../config/logger';

export interface TestJobData {
  message: string;
}

export async function processTestJob(job: Job<TestJobData>): Promise<{ echoed: string }> {
  logger.info({ jobId: job.id, data: job.data }, 'Processing test job');
  return { echoed: job.data.message };
}
