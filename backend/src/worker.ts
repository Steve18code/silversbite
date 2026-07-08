import { logger } from './config/logger';
import { startWorkers } from './queue/worker-registry';

const workers = startWorkers();

logger.info(`Started ${workers.length} worker(s)`);

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, closing workers...`);
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
