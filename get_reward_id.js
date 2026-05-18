const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const profile = await prisma.consumerProfile.findFirst();
  console.log('Reward ID:', profile.gasRewardWalletId);
}
main().finally(() => prisma.$disconnect());
