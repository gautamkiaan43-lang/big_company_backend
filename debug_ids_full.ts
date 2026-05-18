import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const retailers = await prisma.retailerProfile.findMany();
  console.log('FULL_IDS_START');
  retailers.forEach(r => {
    console.log(`PRO_ID:${r.id}`);
    console.log(`SHOP:${r.shopName}`);
  });
  console.log('FULL_IDS_END');
}

main().catch(console.error).finally(() => prisma.$disconnect());
