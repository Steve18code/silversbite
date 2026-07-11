import type { Job } from 'bullmq';
import { logger } from '../../config/logger';
import { getOrCreateCustomer } from '../../services/customer-service';
import { getOrCreateActiveConversation, appendMessage } from '../../services/conversation-service';
import { isOwnerNumber } from '../../services/owner-services';
import { downloadMedia, sendTextMessage, markMessageAsRead } from '../../services/whatsapp-client';
import { transcribeAudio } from '../../services/transcription-service';
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
  let transcript: string | null = null;
  let mediaUrl: string | null = null;

  if (msg.type === 'audio' && msg.mediaId) {
    const { buffer, mimeType } = await downloadMedia(msg.mediaId);
    transcript = await transcribeAudio(buffer, mimeType);
    mediaUrl = await uploadMedia(buffer, mimeType, `voice-notes/${customer.id}`);
    content = '[voice note]';
    logger.info({ transcript }, 'Transcribed voice note');
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
    transcript,
  });

  const effectiveText = transcript ?? content;
  const reply = ownerStatus
    ? `Got it — you said: "${effectiveText}". Menu management via chat lands in Gate 8; for now this just confirms the pipeline works.`
    : `Hi${customer.name ? ` ${customer.name}` : ''}! Thanks for messaging Silverbites 🍲. We received: "${effectiveText}". Our full ordering assistant is coming very soon!`;

  await sendTextMessage(msg.fromPhoneNumber, reply);

  await appendMessage({
    conversationId: conversation.id,
    senderType: 'AI',
    content: reply,
  });
}
