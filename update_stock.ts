import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  await prisma.product.update({
    where: { id: 19 },
    data: { stock: 48 }
  });
  console.log('Stock updated successfully.');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
