import prisma from './utils/prisma';

async function check() {
  const p1 = await prisma.consumerProfile.findUnique({ where: { id: 1 } });
  const p2 = await prisma.consumerProfile.findUnique({ where: { id: 2 } });
  console.log(`P1: ${p1?.fullName} (userId: ${p1?.userId})`);
  console.log(`P2: ${p2?.fullName} (userId: ${p2?.userId})`);
  await prisma.$disconnect();
}
check();
