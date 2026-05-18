import prisma from './utils/prisma';

async function list() {
  const consumers = await prisma.consumerProfile.findMany({
    select: { fullName: true, id: true, gasRewardWalletId: true }
  });
  console.log(JSON.stringify(consumers, null, 2));
  await prisma.$disconnect();
}
list();
