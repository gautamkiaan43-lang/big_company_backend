import prisma from '../src/utils/prisma';

async function main() {
  const user = await prisma.user.findFirst({
    where: { phone: '+250788100001' },
    include: { consumerProfile: true }
  });

  if (user && user.consumerProfile) {
    // Delete existing wallets for this consumer to avoid duplicates
    await prisma.wallet.deleteMany({
      where: { consumerId: user.consumerProfile.id }
    });

    const wallet = await prisma.wallet.create({
      data: {
        consumerId: user.consumerProfile.id,
        type: 'dashboard_wallet',
        balance: 50000,
        currency: 'RWF'
      }
    });
    console.log('Created Wallet successfully:', JSON.stringify(wallet, null, 2));
  } else {
    console.log('User or consumer profile not found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
