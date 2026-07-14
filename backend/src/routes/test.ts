import { Router } from 'express';
import { z } from 'zod';
import { getQueue } from '../queue/queue';
import { QUEUE_NAMES } from '../queue/queue-names';
import type { TestJobData } from '../queue/processors/test-processor';
import { asyncHandler } from '../middleware/error-handler';
import { ValidationError, NotFoundError } from '../errors/app-error';

export const testRouter = Router();

const enqueueSchema = z.object({
  message: z.string().min(1),
});

/**
 * POST /test/enqueue { "message": "hello" }
 * Enqueues a job onto the "test" queue and returns its ID immediately —
 * proves the HTTP layer never blocks on the actual work.
 */
testRouter.post(
  '/enqueue',
  asyncHandler(async (req, res) => {
    const parsed = enqueueSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0]?.message ?? 'Invalid body');
    }

    const queue = getQueue(QUEUE_NAMES.TEST);
    const job = await queue.add('echo', { message: parsed.data.message } satisfies TestJobData);

    res.status(202).json({ jobId: job.id, status: 'queued' });
  }),
);

/**
 * GET /test/job/:id
 * Lets you poll a job's state/result — useful for confirming the worker
 * actually picked it up and completed it.
 */
testRouter.get(
  '/job/:id',
  asyncHandler(async (req, res) => {
    const jobId = req.params.id;
    if (!jobId) {
      throw new ValidationError('Job id is required');
    }

    const queue = getQueue(QUEUE_NAMES.TEST);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new NotFoundError(`No job with id ${jobId}`);
    }

    const state = await job.getState();
    res.json({ id: job.id, state, returnValue: job.returnvalue });
  }),
);

/**
 * GET /test/boom
 * Deliberately throws to prove errorHandler catches unexpected errors
 * and never leaks a raw stack trace to the client.
 */
testRouter.get(
  '/boom',
  asyncHandler(async () => {
    throw new Error('Deliberate test error for Gate 2 verification');
  }),
);
