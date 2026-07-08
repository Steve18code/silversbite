/// <reference types="node" />
// @ts-ignore: Prisma client package may not be available until installed/generated.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Silverbites database...');

  await prisma.ownerNumber.upsert({
    where: { phoneNumber: '+2347045948442' },
    update: {},
    create: {
      phoneNumber: '+2347045948442',
      label: 'Silverbites Owner (seed placeholder)',
    },
  });

  const categories = [
    { name: 'Starters', order: 1 },
    { name: 'Mains', order: 2 },
    { name: 'Drinks', order: 3 },
    { name: 'Desserts', order: 4 },
  ];

  const categoryRecords: Record<string, string> = {};
  for (const cat of categories) {
    const record = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categoryRecords[cat.name] = record.id;
  }

  const menuItems = [
    { name: 'Peppered Snails', category: 'Starters', priceKobo: 350000 },
    { name: 'Suya Skewers', category: 'Starters', priceKobo: 250000 },
    { name: 'Jollof Rice', category: 'Mains', priceKobo: 250000 },
    { name: 'Fried Rice', category: 'Mains', priceKobo: 250000 },
    { name: 'Pounded Yam & Egusi', category: 'Mains', priceKobo: 400000 },
    { name: 'Grilled Chicken', category: 'Mains', priceKobo: 350000 },
    { name: 'Coke', category: 'Drinks', priceKobo: 80000 },
    { name: 'Chapman', category: 'Drinks', priceKobo: 150000 },
    { name: 'Zobo', category: 'Drinks', priceKobo: 100000 },
    { name: 'Puff Puff', category: 'Desserts', priceKobo: 100000 },
  ];

  for (const item of menuItems) {
    const categoryId = categoryRecords[item.category];
    if (!categoryId) continue;

    const existing = await prisma.menuItem.findFirst({ where: { name: item.name } });
    if (existing) continue;

    await prisma.menuItem.create({
      data: {
        name: item.name,
        priceKobo: item.priceKobo,
        categoryId,
      },
    });
  }

  console.log('Seed complete:');
  console.log(`  ${categories.length} categories`);
  console.log(`  ${menuItems.length} menu items`);
  console.log('  1 owner number (placeholder — update before going live)');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
