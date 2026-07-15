import type { Job } from 'bullmq';
import { logger } from '../../config/logger';
import { getOrCreateCustomer } from '../../services/customer-service';
import { getOrCreateActiveConversation, appendMessage } from '../../services/conversation-service';
import { isOwnerNumber } from '../../services/owner-service';
import { downloadMedia, sendTextMessage, markMessageAsRead } from '../../services/whatsapp-client';
import { uploadMedia } from '../../services/storage-service';
import type { WhatsAppInboundJobData } from './whatsapp-inbound-job';

export async function processWhatsAppInbound(job: Job<WhatsAppInboundJobData>): Promise<void> {
  const msg = job.data;
  logger.info({ from: msg.fromPhoneNumber, type: msg.type }, 'Processing inbound WhatsApp message');

  await markMessageAsRead(msg.waMessageId).catch((err) => {
    logger.warn({ err }, 'Failed to mark message as read');
  });

  const [customer, ownerStatus] = await Promise.all([
    getOrCreateCustomer(msg.fromPhoneNumber, msg.senderName),
    isOwnerNumber(msg.fromPhoneNumber),
  ]);

  const conversation = await getOrCreateActiveConversation(customer.id);

  let content = msg.text ?? '';
  let mediaUrl: string | null = null;
  let isUnsupportedVoiceNote = false;

  if (msg.type === 'audio' && msg.mediaId) {
    const { buffer, mimeType } = await downloadMedia(msg.mediaId);
    mediaUrl = await uploadMedia(buffer, mimeType, `voice-notes/${customer.id}`);
    content = '[voice note — transcription currently disabled]';
    isUnsupportedVoiceNote = true;
  } else if ((msg.type === 'image' || msg.type === 'document') && msg.mediaId) {
    const { buffer, mimeType } = await downloadMedia(msg.mediaId);
    mediaUrl = await uploadMedia(buffer, mimeType, `${msg.type}s/${customer.id}`);
    content = `[${msg.type}]`;
  }

  await appendMessage({
    conversationId: conversation.id,
    senderType: ownerStatus ? 'OWNER' : 'CUSTOMER',
    content,
    mediaUrl,
  });

  let reply: string;

  if (isUnsupportedVoiceNote) {
    reply = `Hi${customer.name ? ` ${customer.name}` : ''}! We got your voice note, but we can't listen to it just yet 🙏 — please type your message instead for now, and we'll reply right away.`;
  } else if (ownerStatus) {
    reply = `Got it — you said: "${content}". Menu management via chat lands in Gate 8; for now this just confirms the pipeline works.`;
  } else {
    reply = `Hi${customer.name ? ` ${customer.name}` : ''}! Thanks for messaging Silverbites 🍲. We received: "${content}". Our full ordering assistant is coming very soon!`;
  }

  await sendTextMessage(msg.fromPhoneNumber, reply);

  await appendMessage({
    conversationId: conversation.id,
    senderType: 'AI',
    content: reply,
  });
}
