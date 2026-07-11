import { prisma } from '../config/prisma';

export async function getOrCreateCustomer(phoneNumber: string, name?: string) {
  const existing = await prisma.customer.findUnique({ where: { phoneNumber } });
  if (existing) {
    if (!existing.name && name) {
      return prisma.customer.update({ where: { id: existing.id }, data: { name } });
    }
    return existing;
  }

  return prisma.customer.create({
    data: { phoneNumber, name },
  });
}

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
          items: customer.orders[0].items.map((i: { menuItem: { name: any }; quantity: any }) => ({
            name: i.menuItem.name,
            quantity: i.quantity,
          })),
          placedAt: customer.orders[0].createdAt,
        }
      : null,
  };
}
