
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSeeds() {
  try {
    const retailer = await prisma.retailerProfile.findFirst({
      where: { shopName: 'Corner Shop111' }
    });

    if (!retailer) {
      console.log('Retailer not found');
      return;
    }

    console.log('Retailer ID:', retailer.id);

    const products = await prisma.product.findMany({
      where: { retailerId: retailer.id }
    });

    console.log('Products for Corner Shop111:', JSON.stringify(products, null, 2));

    const seeds = products.find(p => p.name.toLowerCase().includes('seeds'));
    if (seeds) {
      console.log('Seeds found:', JSON.stringify(seeds, null, 2));
    } else {
      console.log('Seeds NOT found in retailer inventory');
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSeeds();
