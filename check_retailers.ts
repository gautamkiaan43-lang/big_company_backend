
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const count = await prisma.retailerProfile.count();
    const retailers = await prisma.retailerProfile.findMany({ select: { id: true, address: true, shopName: true } });
    console.log(`Count: ${count}`);
    console.log(JSON.stringify(retailers, null, 2));
}

check()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
