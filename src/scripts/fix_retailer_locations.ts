import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Populating location data for test retailers...');

  // Update Retailer 1 (Corner Shop111)
  await prisma.retailerProfile.update({
    where: { id: 1 },
    data: {
      province: 'Kigali',
      district: 'Gasabo',
      sector: 'Remera'
    }
  });

  // Update Retailer 5 (test 3)
  await prisma.retailerProfile.update({
    where: { id: 5 },
    data: {
      province: 'Kigali',
      district: 'Kicukiro',
      sector: 'Kagarama'
    }
  });

  console.log('✅ Location data populated.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
