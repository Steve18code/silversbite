import { prisma } from '../config/prisma';
import type { SenderType } from '@prisma/client';

/**
 * Gate 5 keeps this deliberately simple: one ongoing conversation per
 * customer, reused indefinitely (find the most recent one, or create the
 * first). Gate 6's Conversation Engine will build real session/topic logic
 * (e.g. starting a fresh conversation after long inactivity) on top of this
 * — this function is intentionally the minimal version that unblocks
 * webhook → message persistence for now.
 */
export async function getOrCreateActiveConversation(customerId: string) {
  const existing = await prisma.conversation.findFirst({
    where: { customerId, isHandedOff: false },
    orderBy: { updatedAt: 'desc' },
  });

  if (existing) return existing;

  return prisma.conversation.create({
    data: { customerId },
  });
}

export async function appendMessage(params: {
  conversationId: string;
  senderType: SenderType;
  content: string;
  mediaUrl?: string | null;
  transcript?: string | null;
}) {
  const message = await prisma.message.create({
    data: {
      conversationId: params.conversationId,
      senderType: params.senderType,
      content: params.content,
      mediaUrl: params.mediaUrl,
      transcript: params.transcript,
    },
  });

  // Bump updatedAt so getOrCreateActiveConversation's "most recent" lookup
  // reflects real conversation activity, not just creation time.
  await prisma.conversation.update({
    where: { id: params.conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
}
