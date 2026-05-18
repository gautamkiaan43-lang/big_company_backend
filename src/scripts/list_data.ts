import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const retailers = await prisma.retailerProfile.findMany({
    include: {
      user: {
        select: { email: true, phone: true }
      }
    }
  });

  console.log('Available Retailers:');
  retailers.forEach(r => {
    console.log(`- ID: ${r.id}, Name: ${r.shopName}, Email: ${r.user?.email}`);
  });

  const consumers = await prisma.consumerProfile.findMany({
    include: {
      user: {
        select: { phone: true }
      }
    }
  });

  console.log('\nAvailable Consumers:');
  consumers.forEach(c => {
    console.log(`- ID: ${c.id}, Phone: ${c.user?.phone}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
