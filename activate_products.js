const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function activateMissingProducts() {
  console.log('🔧 Activating inactive wholesaler products...\n');

  // Activate ALL inactive wholesaler products so they appear in Add Stock
  const result = await prisma.product.updateMany({
    where: {
      wholesalerId: { not: null },
      retailerId: null,
      status: 'inactive'
    },
    data: { status: 'active' }
  });

  console.log(`✅ Activated ${result.count} product(s)\n`);

  // Show final state
  const products = await prisma.product.findMany({
    where: { wholesalerId: { not: null } },
    select: { id: true, name: true, status: true, stock: true }
  });

  console.log('📦 All wholesaler products now:');
  products.forEach(p => {
    console.log(`  ID:${p.id} | "${p.name}" | status: ${p.status} | stock: ${p.stock}`);
  });

  await prisma.$disconnect();
}

activateMissingProducts().catch(e => {
  console.error(e.message);
  prisma.$disconnect();
});
