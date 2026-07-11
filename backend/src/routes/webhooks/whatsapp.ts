import { Router } from 'express';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { asyncHandler } from '../../middleware/error-handler';
import { verifyWebhookSignature } from '../../utils/verify-webhook-signature';
import { parseInboundMessages, type WhatsAppWebhookPayload } from '../../types/whatsapp-webhook';
import { getQueue } from '../../queue/queue';
import { QUEUE_NAMES } from '../../queue/queue-names';

export const whatsappWebhookRouter = Router();

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

    res.sendStatus(200);

    const payload = req.body as WhatsAppWebhookPayload;
    const messages = parseInboundMessages(payload);

    if (messages.length === 0) {
      return;
    }

    const queue = getQueue(QUEUE_NAMES.TEST);
    for (const message of messages) {
      await queue.add('inbound-message', message);
    }

    logger.info({ count: messages.length }, 'Enqueued inbound WhatsApp message(s)');
  }),
);
