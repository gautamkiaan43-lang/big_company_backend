import prisma from './utils/prisma';

async function count() {
  const r1 = await prisma.gasReward.findMany({ where: { consumerId: 1 } });
  const r2 = await prisma.gasReward.findMany({ where: { consumerId: 2 } });

  const sum1 = r1.reduce((sum, r) => sum + r.units, 0);
  const sum2 = r2.reduce((sum, r) => sum + r.units, 0);

  console.log(`=== REWARDS STATE ===`);
  console.log(`Consumer 1 (250788123456): ${r1.length} records | Total Balance: ${sum1.toFixed(4)} M³`);
  console.log(`Consumer 2 (250788100001): ${r2.length} records | Total Balance: ${sum2.toFixed(4)} M³`);
  console.log(`======================`);

  await prisma.$disconnect();
}
count();
