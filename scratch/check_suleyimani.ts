import prisma from '../src/utils/prisma';

async function main() {
  console.log('Searching for "suleyimani" in database...');
  
  // Find in User
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'sule' } },
        { email: { contains: 'sule' } },
        { phone: { contains: 'sule' } }
      ]
    }
  });
  console.log('Matching Users:', users);

  // Find in ConsumerProfile
  const profiles = await prisma.consumerProfile.findMany({
    where: {
      fullName: { contains: 'sule' }
    },
    include: {
      user: true,
      wallets: true
    }
  });
  console.log('Matching ConsumerProfiles:', profiles);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
