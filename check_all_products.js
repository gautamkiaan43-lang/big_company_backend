const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true,
        price: true,
        retailerId: true,
        wholesalerId: true
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
