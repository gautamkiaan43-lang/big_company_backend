import prisma from './utils/prisma';

async function check() {
  const wallets = await prisma.wallet.findMany({
    include: {
      consumerProfile: {
        include: {
          user: true
        }
      }
    }
  });
  console.log(JSON.stringify(wallets, null, 2));
  await prisma.$disconnect();
}
check();
