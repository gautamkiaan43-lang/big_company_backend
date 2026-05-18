
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      role: true,
      consumerProfile: { select: { id: true } }
    }
  });
  console.log(JSON.stringify(users, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
