const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const ws = await prisma.retailerProfile.findFirst({
      where: { shopName: { contains: 'Corner' } }
    });

    if (!ws) {
      console.log('Retailer not found');
      return;
    }

    console.log('Retailer ID:', ws.id);
    const products = await prisma.product.findMany({
      where: { retailerId: ws.id },
      select: {
        id: true,
        name: true,
        image: true,
        price: true
      }
    });
    console.log(JSON.stringify(products, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
