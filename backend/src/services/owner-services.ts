import { prisma } from '../config/prisma';

/**
 * This is deliberately NOT a JWT/session check. Per FR-8.2, the WhatsApp-side
 * "owner" identity is established purely by whether the sending phone number
 * is allow-listed — there's no login flow over WhatsApp. Gate 6's sender
 * classification will call this to decide whether an inbound message gets
 * routed to owner tools (add/edit menu) or the customer ordering flow.
 */
export async function isOwnerNumber(phoneNumber: string): Promise<boolean> {
  const match = await prisma.ownerNumber.findUnique({
    where: { phoneNumber },
  });
  return match !== null;
}

export async function listOwnerNumbers() {
  return prisma.ownerNumber.findMany({ orderBy: { createdAt: 'asc' } });
}

export async function addOwnerNumber(phoneNumber: string, label?: string) {
  return prisma.ownerNumber.create({
    data: { phoneNumber, label },
  });
}

export async function removeOwnerNumber(phoneNumber: string): Promise<void> {
  await prisma.ownerNumber.delete({ where: { phoneNumber } });
}
