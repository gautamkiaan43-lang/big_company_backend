import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const meters = await prisma.gasMeter.findMany({
    take: 50,
  });
  console.log(JSON.stringify(meters, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
