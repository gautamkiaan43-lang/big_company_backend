import prisma from './utils/prisma';

async function list() {
  const p = await prisma.consumerProfile.findFirst({
    where: { gasRewardWalletId: 'GRW-QVOX0ILK' }
  });
  if (p) {
    console.log(`KAPIL PROFILE: ID=${p.id}, Name=${p.fullName}`);
  } else {
    console.log('KAPIL NOT FOUND BY REWARD ID');
  }
  await prisma.$disconnect();
}
list();
