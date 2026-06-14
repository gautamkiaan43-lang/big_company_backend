import prisma from '../src/utils/prisma';

async function main() {
  const user = await prisma.user.findFirst({
    where: { phone: '250788100001' }
  });
  console.log('User 250788100001:', JSON.stringify(user, null, 2));

  const allConsumers = await prisma.user.findMany({
    where: { role: 'consumer' }
  });
  console.log('All consumers:', allConsumers.map(u => ({ id: u.id, name: u.name, phone: u.phone, isActive: u.isActive })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
