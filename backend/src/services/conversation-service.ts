import { prisma } from '../config/prisma';
import type { SenderType } from '@prisma/client';

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

  await prisma.conversation.update({
    where: { id: params.conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
}
