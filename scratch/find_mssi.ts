import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const retailer = await prisma.retailerProfile.findFirst({
    where: { shopName: { contains: 'mssi' } },
    include: { user: true }
  });
  console.log(JSON.stringify(retailer, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
