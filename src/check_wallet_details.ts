import prisma from './utils/prisma';

async function check() {
  const profile = await prisma.consumerProfile.findFirst({
    where: { gasRewardWalletId: 'GRW-QVOX0ILK' },
    include: { wallets: true }
  });
  if (profile) {
    console.log(`Profile: ${profile.fullName}, ID: ${profile.id}`);
    profile.wallets.forEach(w => {
      console.log(`- Wallet: type=${w.type}, balance=${w.balance}, ownerId=${w.consumerId}`);
    });
  } else {
    console.log('Profile not found');
  }
  await prisma.$disconnect();
}
check();
