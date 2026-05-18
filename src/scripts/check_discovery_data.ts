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
    console.log(`- ID: ${r.id}, Name: ${r.shopName}, Province: ${r.province}, District: ${r.district}, Sector: ${r.sector}`);
  });

  const consumers = await prisma.consumerProfile.findMany({
    include: {
      user: {
        select: { phone: true }
      },
      customerLinkRequests: {
        where: { status: 'approved' },
        include: { retailer: true }
      }
    }
  });

  console.log('\nAvailable Consumers:');
  consumers.forEach(c => {
    console.log(`- ID: ${c.id}, Phone: ${c.user?.phone}`);
    console.log(`  Approved Links: ${c.customerLinkRequests.map(r => r.retailer.shopName).join(', ') || 'None'}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
