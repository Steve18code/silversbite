/**
 * There is no public /register endpoint — this is a single-tenant restaurant
 * dashboard, not a SaaS with self-serve signup. New dashboard users (the
 * owner, staff) are created via this script, run manually by whoever has
 * server/DB access.
 *
 * Usage:
 *   npx tsx scripts/create-user.ts "Chidi Okafor" chidi@silverbites.com "a-strong-password" OWNER
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/services/auth-service';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const name = args[0];
  const email = args[1];
  const password = args[2];
  const roleArg = args[3];

  if (!name || !email || !password) {
    console.error('Usage: npx tsx scripts/create-user.ts "<name>" <email> <password> [OWNER|STAFF]');
    process.exit(1);
  }

  // Explicit re-check with a type guard, rather than relying on
  // process.exit()'s `never` return type to narrow the outer variables —
  // keeps this correct even under stricter TS module/resolution settings.
  if (!name || !email || !password) {
    throw new Error('Unreachable: already validated above');
  }

  const role = roleArg === 'STAFF' ? 'STAFF' : 'OWNER'; // defaults to OWNER

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`A user with email ${email} already exists.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  console.log(`Created user: ${user.name} <${user.email}> [${user.role}]`);
}

main()
  .catch((e) => {
    console.error('Failed to create user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
