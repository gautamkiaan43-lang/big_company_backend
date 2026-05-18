import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const transactions = await prisma.walletTransaction.findMany({
    where: { status: 'pending', retailerId: 6 },
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(transactions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
