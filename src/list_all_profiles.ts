import prisma from './utils/prisma';

async function check() {
  const p = await prisma.consumerProfile.findMany({ include: { user: true } });
  p.forEach(x => console.log(`>>> PROFILE: ${x.id} | USER: ${x.userId} | EMAIL: ${x.user.email} | NAME: ${x.fullName} | REWARD: ${x.gasRewardWalletId}`));
  await prisma.$disconnect();
}
check();
