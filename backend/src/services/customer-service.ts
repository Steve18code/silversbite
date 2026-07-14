import { prisma } from '../config/prisma';

/**
 * Every customer is uniquely identified by phone number (FR-4.1). This is
 * the single entry point for "who is this" — called on every inbound
 * WhatsApp message so the same person is recognized across conversations.
 */
export async function getOrCreateCustomer(phoneNumber: string, name?: string) {
  const existing = await prisma.customer.findUnique({ where: { phoneNumber } });
  if (existing) {
    // Backfill name if we didn't have one before (e.g. first message had no
    // profile name attached, a later one does) — never overwrite a name we
    // already have with a blank.
    if (!existing.name && name) {
      return prisma.customer.update({ where: { id: existing.id }, data: { name } });
    }
    return existing;
  }

  return prisma.customer.create({
    data: { phoneNumber, name },
  });
}

/** Powers FR-4.3 — the AI's personalized greeting for returning customers. */
export async function getCustomerHistorySummary(phoneNumber: string) {
  const customer = await prisma.customer.findUnique({
    where: { phoneNumber },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { items: { include: { menuItem: true } } },
      },
    },
  });

  if (!customer) return null;

  const orderCount = await prisma.order.count({ where: { customerId: customer.id } });

  return {
    name: customer.name,
    orderCount,
    lastOrder: customer.orders[0]
      ? {
          items: customer.orders[0].items.map((i) => ({
            name: i.menuItem.name,
            quantity: i.quantity,
          })),
          placedAt: customer.orders[0].createdAt,
        }
      : null,
  };
}
