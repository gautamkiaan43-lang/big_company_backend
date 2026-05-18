const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.consumerProfile.update({
    where: { id: 1 }, 
    data: { gasRewardWalletId: 'GRW-TEST-123' }
  });
  console.log('Reward ID updated to GRW-TEST-123');
}
main().finally(() => prisma.$disconnect());
