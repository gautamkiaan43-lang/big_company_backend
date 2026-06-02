const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Find Real pro2 and Sugar 1kg - case insensitive search
  const missing = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: 'Real pro' } },
        { name: { contains: 'Sugar 1' } },
        { name: { contains: 'real pro' } },
        { name: { contains: 'sugar 1' } }
      ]
    },
    select: { id: true, name: true, status: true, stock: true, wholesalerId: true, retailerId: true }
  });
  console.log('=== Real pro2 / Sugar 1kg in DB ===');
  console.log(JSON.stringify(missing, null, 2));

  // All wholesaler products and statuses
  const allWholesalerProducts = await prisma.product.findMany({
    where: { wholesalerId: { not: null } },
    select: { id: true, name: true, status: true, stock: true, wholesalerId: true, retailerId: true }
  });
  console.log('\n=== ALL Wholesaler Products ===');
  console.log(JSON.stringify(allWholesalerProducts, null, 2));

  // Retailers and their linked wholesaler
  const retailers = await prisma.retailerProfile.findMany({
    select: { id: true, shopName: true, linkedWholesalerId: true }
  });
  console.log('\n=== Retailers & their linkedWholesalerId ===');
  console.log(JSON.stringify(retailers, null, 2));

  await prisma.$disconnect();
}

check().catch(e => {
  console.error(e.message);
  prisma.$disconnect();
});
