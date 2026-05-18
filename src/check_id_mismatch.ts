import prisma from './utils/prisma';

async function check() {
  const profile = await prisma.consumerProfile.findFirst({
    where: { gasRewardWalletId: 'GRW-QVOX0ILK' }
  });
  if (profile) {
    console.log(`FOUND PROFILE: ID=${profile.id}, Name=${profile.fullName}`);
    const wallets = await prisma.wallet.findMany({
      where: { consumerId: profile.id }
    });
    console.log(`WALLETS FOR CONSUMER ID ${profile.id}:`);
    wallets.forEach(w => console.log(`- Type: ${w.type}, Balance: ${w.balance}`));
    
    const allWallets = await prisma.wallet.findMany();
    console.log('ALL WALLETS IN DB:');
    allWallets.forEach(w => console.log(`- ID: ${w.id}, consumerId: ${w.consumerId}, Type: ${w.type}, Balance: ${w.balance}`));
  }
  await prisma.$disconnect();
}
check();
