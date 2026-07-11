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
  from: string;
  id: string;
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

export interface ParsedInboundMessage {
  waMessageId: string;
  fromPhoneNumber: string;
  senderName?: string;
  type: WhatsAppInboundMessage['type'];
  text?: string;
  mediaId?: string;
  mediaMimeType?: string;
}

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
