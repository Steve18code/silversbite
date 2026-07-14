import { env } from '../config/env';
import { logger } from '../config/logger';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * All calls go through the Graph API using the phone number's ID (not the
 * phone number itself) as the endpoint identifier — that's how Meta's Cloud
 * API is addressed. WHATSAPP_ACCESS_TOKEN is the permanent/system-user token
 * generated in Meta's App Dashboard.
 */
function graphUrl(path: string): string {
  return `${GRAPH_BASE_URL}/${path}`;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

async function graphRequest<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const body = await response.text();
    logger.error({ status: response.status, body, url }, 'WhatsApp Graph API request failed');
    throw new Error(`WhatsApp API error (${response.status}): ${body}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Sends a plain text message. Meta requires messages be sent within a
 * 24-hour customer-service window unless using a pre-approved template —
 * fine for our use case since we're always replying to an inbound message.
 */
export async function sendTextMessage(to: string, body: string): Promise<void> {
  await graphRequest(graphUrl(`${env.WHATSAPP_PHONE_NUMBER_ID}/messages`), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  });

  logger.info({ to }, 'Sent WhatsApp text message');
}

/**
 * Marks an inbound message as read (blue ticks). Good practice so the
 * customer knows the message landed, even before the AI/queue has replied.
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  await graphRequest(graphUrl(`${env.WHATSAPP_PHONE_NUMBER_ID}/messages`), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  });
}

interface MediaUrlResponse {
  url: string;
  mime_type: string;
  file_size: number;
}

/**
 * Media in WhatsApp webhooks arrives as a `media_id`, not a direct URL.
 * Two-step fetch: (1) resolve the id to a short-lived download URL,
 * (2) download the actual bytes from that URL — both require the same
 * bearer token, and the URL expires after a few minutes.
 */
export async function downloadMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const meta = await graphRequest<MediaUrlResponse>(graphUrl(mediaId), {
    method: 'GET',
    headers: authHeaders(),
  });

  const fileResponse = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` },
  });

  if (!fileResponse.ok) {
    throw new Error(`Failed to download WhatsApp media ${mediaId}: ${fileResponse.status}`);
  }

  const arrayBuffer = await fileResponse.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), mimeType: meta.mime_type };
}
