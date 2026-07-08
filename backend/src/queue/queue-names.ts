/**
 * Central registry of queue names. Import this instead of hardcoding
 * strings so a typo doesn't silently create a second, orphaned queue.
 *
 * Gate 5+ will add: 'whatsapp-inbound', 'whatsapp-outbound', 'menu-import'.
 */
export const QUEUE_NAMES = {
  TEST: 'test',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
