const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSharedRows() {
  const mixedProducts = await prisma.product.findMany({
    where: {
      wholesalerId: { not: null },
      retailerId: { not: null }
    }
  });

  console.log(`Found ${mixedProducts.length} products with BOTH wholesalerId and retailerId set.`);
  if (mixedProducts.length > 0) {
    console.log(JSON.stringify(mixedProducts, null, 2));
  }

  await prisma.$disconnect();
}

checkSharedRows().catch(e => {
  console.error(e);
  prisma.$disconnect();
});
