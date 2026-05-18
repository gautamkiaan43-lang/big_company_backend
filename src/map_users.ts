import prisma from './utils/prisma';

async function check() {
  const u = await prisma.user.findUnique({
    where: { id: 1 },
    include: { consumerProfile: true }
  });
  console.log(`User ID 1: Role=${u?.role}, Email=${u?.email}, ProfileID=${u?.consumerProfile?.id}`);
  
  const p = await prisma.consumerProfile.findFirst({
    where: { gasRewardWalletId: 'GRW-QVOX0ILK' }
  });
  console.log(`Profile with RewardID GRW-QVOX0ILK: ID=${p?.id}, userId=${p?.userId}`);
  
  await prisma.$disconnect();
}
check();
