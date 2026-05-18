import prisma from './utils/prisma';

async function checkCustomers() {
  const customers = await prisma.consumerProfile.findMany({
    include: { user: true },
    orderBy: { id: 'desc' },
    take: 5
  });

  console.log('\n📊 Recent Customers in Database:\n');
  customers.forEach((c, i) => {
    console.log(`${i + 1}. Customer ID: ${c.id}`);
    console.log(`   fullName: "${c.fullName}"`);
    console.log(`   user.name: "${c.user.name}"`);
    console.log(`   phone: ${c.user.phone}`);
    console.log(`   email: ${c.user.email || 'N/A'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkCustomers().catch(console.error);
