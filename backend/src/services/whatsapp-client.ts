import { env } from '../config/env';
import { logger } from '../config/logger';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

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

export async function downloadMedia(
  mediaId: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
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
