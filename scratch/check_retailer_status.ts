import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const retailer = await prisma.retailerProfile.findFirst({
    where: {
      user: {
        email: 'sam123.retailer@big.co.rw'
      }
    },
    include: {
      user: true
    }
  });

  if (!retailer) {
    console.log('Retailer not found');
    return;
  }

  console.log('Retailer Profile:', JSON.stringify({
    id: retailer.id,
    shopName: retailer.shopName,
    isVerified: retailer.isVerified,
    province: retailer.province,
    district: retailer.district,
    sector: retailer.sector
  }, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
