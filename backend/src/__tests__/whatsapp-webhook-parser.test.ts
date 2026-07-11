import { describe, expect, it } from 'vitest';
import { parseInboundMessages, type WhatsAppWebhookPayload } from '../types/whatsapp-webhook';

describe('parseInboundMessages', () => {
  it('parses a simple text message', () => {
    const payload: WhatsAppWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '2348000000000', phone_number_id: 'pnid123' },
                contacts: [{ profile: { name: 'Steve' }, wa_id: '2348012345678' }],
                messages: [
                  {
                    from: '2348012345678',
                    id: 'wamid.abc123',
                    timestamp: '1720000000',
                    type: 'text',
                    text: { body: 'I want 2 jollof rice' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = parseInboundMessages(payload);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      waMessageId: 'wamid.abc123',
      fromPhoneNumber: '2348012345678',
      senderName: 'Steve',
      type: 'text',
      text: 'I want 2 jollof rice',
    });
  });

  it('parses an audio (voice note) message and extracts the media id', () => {
    const payload: WhatsAppWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '2348000000000', phone_number_id: 'pnid123' },
                messages: [
                  {
                    from: '2348012345678',
                    id: 'wamid.voice1',
                    timestamp: '1720000001',
                    type: 'audio',
                    audio: { id: 'media123', mime_type: 'audio/ogg; codecs=opus' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = parseInboundMessages(payload);

    expect(result[0]).toMatchObject({
      type: 'audio',
      mediaId: 'media123',
      mediaMimeType: 'audio/ogg; codecs=opus',
      text: undefined,
    });
  });

  it('returns an empty array for a payload with no messages (e.g. a status update)', () => {
    const payload: WhatsAppWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '2348000000000', phone_number_id: 'pnid123' },
                statuses: [
                  {
                    id: 'wamid.out1',
                    status: 'delivered',
                    timestamp: '1720000002',
                    recipient_id: '234801234',
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    expect(parseInboundMessages(payload)).toEqual([]);
  });

  it('handles multiple messages across multiple entries', () => {
    const payload: WhatsAppWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '2348000000000', phone_number_id: 'pnid123' },
                messages: [
                  { from: '234801', id: 'm1', timestamp: '1', type: 'text', text: { body: 'hi' } },
                ],
              },
            },
          ],
        },
        {
          id: 'entry2',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '2348000000000', phone_number_id: 'pnid123' },
                messages: [
                  { from: '234802', id: 'm2', timestamp: '2', type: 'text', text: { body: 'hey' } },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = parseInboundMessages(payload);
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.waMessageId)).toEqual(['m1', 'm2']);
  });
});
