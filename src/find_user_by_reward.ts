import prisma from './utils/prisma';

async function find() {
  const profile = await prisma.consumerProfile.findFirst({
    where: { gasRewardWalletId: 'GRW-QVOX0ILK' },
    include: { wallets: true }
  });
  if (profile) {
    console.log(`User: ${profile.fullName} (ID: ${profile.id})`);
    profile.wallets.forEach(w => {
      console.log(`Wallet ID: ${w.id}, Type: ${w.type}, Balance: ${w.balance}`);
    });
  } else {
    console.log('Profile not found');
  }
  await prisma.$disconnect();
}
find();
