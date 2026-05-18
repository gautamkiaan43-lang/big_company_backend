import prisma from './utils/prisma';

async function count() {
  const count = await prisma.gasReward.count({
    where: { consumerId: 1 }
  });
  console.log(`Gas rewards count: ${count}`);
  await prisma.$disconnect();
}
count();
