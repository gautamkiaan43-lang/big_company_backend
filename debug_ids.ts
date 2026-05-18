import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const retailers = await prisma.retailerProfile.findMany({
    include: { user: true }
  });
  console.log('Retailers:');
  retailers.forEach(r => {
    console.log(`- Profile ID: ${r.id}, User ID: ${r.userId}, Name: ${r.shopName}, Active: ${r.user?.isActive}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
