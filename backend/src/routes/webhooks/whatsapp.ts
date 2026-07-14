import { Router } from 'express';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { asyncHandler } from '../../middleware/error-handler';
import { verifyWebhookSignature } from '../../utils/verify-webhook-signature';
import { parseInboundMessages, type WhatsAppWebhookPayload } from '../../types/whatsapp-webhook';
import { getQueue } from '../../queue/queue';
import { QUEUE_NAMES } from '../../queue/queue-names';
import type { WhatsAppInboundJobData } from '../../queue/processors/whatsapp-inbound-job';

export const whatsappWebhookRouter = Router();

/**
 * GET /webhooks/whatsapp
 * Meta's one-time verification handshake, run when you register the webhook
 * URL in the App Dashboard. Meta sends hub.mode/hub.verify_token/hub.challenge
 * as query params; we must echo back hub.challenge as plain text if the
 * verify token matches what we configured — anything else and Meta rejects
 * the webhook URL as invalid.
 */
whatsappWebhookRouter.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified successfully');
    res.status(200).send(challenge);
    return;
  }

  logger.warn({ mode, tokenProvided: Boolean(token) }, 'WhatsApp webhook verification failed');
  res.sendStatus(403);
});

/**
 * POST /webhooks/whatsapp
 * Real inbound events. Verifies Meta's signature against the RAW body
 * (see index.ts for how req.rawBody is captured), then does the minimum
 * possible work — parse + enqueue — before returning 200. Everything else
 * (persistence, transcription, AI reply) happens in the queue worker so
 * Meta's webhook timeout is never at risk.
 */
whatsappWebhookRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const signature = req.header('x-hub-signature-256');
    const isValid = verifyWebhookSignature(req.rawBody, signature);

    if (!isValid) {
      logger.warn('Rejected WhatsApp webhook with invalid signature');
      res.sendStatus(401);
      return;
    }

    // Always 200 once signature is valid, even if there's nothing to
    // process (e.g. a status-only update) — Meta retries aggressively on
    // non-200 responses, which would otherwise cause duplicate processing.
    res.sendStatus(200);

    const payload = req.body as WhatsAppWebhookPayload;
    const messages = parseInboundMessages(payload);

    if (messages.length === 0) {
      return;
    }

    const queue = getQueue(QUEUE_NAMES.WHATSAPP_INBOUND);
    for (const message of messages) {
      await queue.add('inbound-message', message satisfies WhatsAppInboundJobData);
    }

    logger.info({ count: messages.length }, 'Enqueued inbound WhatsApp message(s)');
  }),
);
