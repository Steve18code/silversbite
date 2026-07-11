/**
 * Central registry of queue names. Import this instead of hardcoding
 * strings so a typo doesn't silently create a second, orphaned queue.
 *
 * Gate 8 will add: 'menu-import'. Outbound sending doesn't need its own
 * queue — it's a single fast API call made directly from the processor
 * that generates the reply.
 */
export const QUEUE_NAMES = {
  TEST: 'test',
  WHATSAPP_INBOUND: 'whatsapp-inbound',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
