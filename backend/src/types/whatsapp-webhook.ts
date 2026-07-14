/**
 * Minimal typed shape of what Meta actually sends. Meta's real payload has
 * more optional fields than this; we only type what we read, and treat
 * anything else as opaque. See: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 */
export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  field: string;
  value: {
    messaging_product: 'whatsapp';
    metadata: { display_phone_number: string; phone_number_id: string };
    contacts?: Array<{ profile: { name: string }; wa_id: string }>;
    messages?: WhatsAppInboundMessage[];
    statuses?: WhatsAppStatus[];
  };
}

export interface WhatsAppInboundMessage {
  from: string; // sender's WhatsApp ID (phone number, no leading +)
  id: string; // WhatsApp's message id
  timestamp: string;
  type: 'text' | 'audio' | 'image' | 'document' | 'video' | 'button' | 'interactive' | 'unknown';
  text?: { body: string };
  audio?: { id: string; mime_type: string };
  image?: { id: string; mime_type: string; caption?: string };
  document?: { id: string; mime_type: string; filename?: string; caption?: string };
}

export interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
}

/** Normalized shape our own code works with, independent of Meta's nesting. */
export interface ParsedInboundMessage {
  waMessageId: string;
  fromPhoneNumber: string;
  senderName?: string;
  type: WhatsAppInboundMessage['type'];
  text?: string;
  mediaId?: string;
  mediaMimeType?: string;
}

/**
 * Flattens Meta's deeply nested webhook payload into a simple list of
 * inbound messages. Status updates (delivered/read receipts for OUR
 * outbound messages) are intentionally ignored here — not something the
 * conversation engine needs to react to.
 */
export function parseInboundMessages(payload: WhatsAppWebhookPayload): ParsedInboundMessage[] {
  const results: ParsedInboundMessage[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const messages = change.value.messages ?? [];
      const contactsByWaId = new Map(
        (change.value.contacts ?? []).map((c) => [c.wa_id, c.profile.name]),
      );

      for (const msg of messages) {
        results.push({
          waMessageId: msg.id,
          fromPhoneNumber: msg.from,
          senderName: contactsByWaId.get(msg.from),
          type: msg.type,
          text: msg.text?.body,
          mediaId: msg.audio?.id ?? msg.image?.id ?? msg.document?.id,
          mediaMimeType: msg.audio?.mime_type ?? msg.image?.mime_type ?? msg.document?.mime_type,
        });
      }
    }
  }

  return results;
}
