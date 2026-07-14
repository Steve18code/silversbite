import express from 'express';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { requestId } from './middleware/request-id';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { captureRawBody } from './middleware/capture-raw-body';
import { closeAllQueues } from './queue/queue';
import { testRouter } from './routes/test';
import { authRouter } from './routes/auth';
import { whatsappWebhookRouter } from './routes/webhooks/whatsapp';

const app = express();

// Correlation ID must run before the HTTP logger so every log line can include it.
app.use(requestId);
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => (req as express.Request).requestId,
  }),
);
// `verify` captures the exact raw bytes onto req.rawBody before parsing —
// required for webhook signature verification (WhatsApp, Paystack, etc).
app.use(express.json({ verify: captureRawBody }));

/**
 * Health check — used by Docker Compose / deployment platform to verify
 * the container is actually serving traffic, not just running.
 */
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'silverbites-backend' });
});

// Gate 2 verification routes — safe to delete once Gate 5+ routes exist and
// have proven the same queue/error-handling pipeline in production use.
app.use('/test', testRouter);
app.use('/api/auth', authRouter);
app.use('/webhooks/whatsapp', whatsappWebhookRouter);

// Gate 8+ will mount /webhooks/paystack, /webhooks/flutterwave here.
// Gate 9 will mount /api/* dashboard routes here.

// Must be registered after all real routes.
app.use(notFoundHandler);
// Must be the very last middleware.
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  logger.info(`Silverbites backend listening on port ${env.PORT}`);
});

/**
 * Graceful shutdown: stop accepting new connections, let in-flight requests
 * finish, close the queue's Redis connection, then exit. Docker sends SIGTERM
 * on `docker stop` / a rolling restart — without this, in-flight requests and
 * open Redis connections get killed mid-work.
 */
async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  server.close(async () => {
    try {
      await closeAllQueues();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  });

  // Force-exit if shutdown hangs for more than 10s.
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
