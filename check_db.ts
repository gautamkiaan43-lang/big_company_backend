import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const products = await prisma.product.findMany({
    where: { sku: 'ac-01' }
  });
  console.log(JSON.stringify(products, null, 2));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
