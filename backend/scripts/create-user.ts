/**
 * There is no public /register endpoint — this is a single-tenant restaurant
 * dashboard, not a SaaS with self-serve signup. New dashboard users (the
 * owner, staff) are created via this script, run manually by whoever has
 * server/DB access.
 *
 * Usage:
 *   npx tsx scripts/create-user.ts "Chidi Okafor" chidi@silverbites.com "a-strong-password" OWNER
 */

type HashPasswordFn = (pw: string) => Promise<string>;

type NodeProcess = {
  argv: string[];
  exit(code?: number): never;
};

function getNodeProcess(): NodeProcess {
  const proc = (globalThis as any).process as NodeProcess | undefined;
  if (!proc) {
    throw new Error('This script must be executed in a Node.js environment.');
  }
  return proc;
}

async function loadPrismaClient(): Promise<any> {
  try {
    const mod = await import('@prisma/client');
    const pkg = (mod as any).default ?? mod;
    return pkg.PrismaClient;
  } catch (err) {
    console.error(
      "Could not load @prisma/client. Run 'npm install @prisma/client' and generate the client (prisma generate).",
    );
    getNodeProcess().exit(1);
  }
}

async function loadHashPassword(): Promise<HashPasswordFn> {
  try {
    const mod = await import('../src/services/auth-services');
    if (mod && typeof mod.hashPassword === 'function') {
      return mod.hashPassword as HashPasswordFn;
    }
    throw new Error('hashPassword not found in auth-service');
  } catch (err) {
    const crypto = await import('crypto');
    return async (pw: string) => {
      const salt = crypto.randomBytes(16).toString('hex');
      const derived = crypto.scryptSync(pw, salt, 64).toString('hex');
      return `scrypt$${salt}$${derived}`;
    };
  }
}

async function main() {
  const argv = getNodeProcess().argv.slice(2);
  const [name, email, password, roleArg] = argv;

  if (!name || !email || !password) {
    console.error(
      'Usage: npx tsx scripts/create-user.ts "<name>" <email> <password> [OWNER|STAFF]',
    );
    getNodeProcess().exit(1);
  }

  const PrismaClient = await loadPrismaClient();
  const prisma = new PrismaClient();
  const hashPassword = await loadHashPassword();

  const role = roleArg === 'STAFF' ? 'STAFF' : 'OWNER';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`A user with email ${email} already exists.`);
    getNodeProcess().exit(1);
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  console.log(`Created user: ${user.name} <${user.email}> [${user.role}]`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Failed to create user:', e);
  getNodeProcess().exit(1);
});
