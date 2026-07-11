import type { WhatsAppWebhook } from '../types/whatsapp-webhook';

describe('whatsapp webhook payload', () => {
  it('parses a simple text message payload', () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '1',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                messages: [
                  { from: '1234', id: 'm1', text: { body: 'hello' } },
                ],
              },
            },
          ],
        },
      ],
    } as unknown as WhatsAppWebhook;

    expect(payload.object).toBe('whatsapp_business_account');
    const msg = payload.entry[0].changes[0].value.messages?.[0];
    expect(msg?.text?.body).toBe('hello');
  });
});
