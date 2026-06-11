import prisma from '../src/utils/prisma';

async function main() {
  const products = await prisma.product.findMany({
    where: { OR: [{ name: 'abc' }, { name: 'Standard Corn' }] }
  });
  console.log('Products:', JSON.stringify(products, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
