import type { ParsedInboundMessage } from '../../types/whatsapp-webhook';

/**
 * What the webhook route enqueues. Deliberately just the parsed Meta payload
 * plus nothing else — all DB lookups (customer, conversation) happen inside
 * the processor, not before enqueueing, so the webhook handler stays fast
 * and dumb (per FR-1.3: ack Meta quickly, do real work async).
 */
export type WhatsAppInboundJobData = ParsedInboundMessage;
