import prisma from './utils/prisma';

async function fixLastCustomer() {
  console.log('🔧 Fixing last customer (ID: 7)...\n');
  
  const customer = await prisma.consumerProfile.findUnique({
    where: { id: 7 },
    include: { user: true }
  });

  if (!customer) {
    console.log('Customer not found!');
    return;
  }

  console.log('Current data:');
  console.log(`  name: "${customer.user.name}"`);
  console.log(`  fullName: "${customer.fullName}"`);
  console.log(`  email: "${customer.user.email}"`);
  
  // Extract name from email
  const emailName = customer.user.email!.split('@')[0];
  const newName = emailName
    .split(/[._-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

  console.log(`\nNew name: "${newName}"`);

  await prisma.user.update({
    where: { id: customer.userId },
    data: { name: newName }
  });

  await prisma.consumerProfile.update({
    where: { id: 7 },
    data: { fullName: null }
  });

  console.log('\n✅ Fixed!');
  await prisma.$disconnect();
}

fixLastCustomer().catch(console.error);
