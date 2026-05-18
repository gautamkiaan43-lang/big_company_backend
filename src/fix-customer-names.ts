import prisma from './utils/prisma';

async function fixCustomerNames() {
  console.log('🔧 Fixing customer names...\n');
  
  const customers = await prisma.consumerProfile.findMany({
    include: { user: true }
  });

  for (const customer of customers) {
    const currentName = customer.user.name;
    const currentFullName = customer.fullName;
    
    // Check if name is "undefined undefined" or similar issues
    if (!currentName || currentName.includes('undefined') || currentName.trim() === '') {
      const newName = customer.user.phone; // Fallback to phone
      
      console.log(`Fixing Customer ID ${customer.id}:`);
      console.log(`  Old name: "${currentName}"`);
      console.log(`  New name: "${newName}"`);
      
      await prisma.user.update({
        where: { id: customer.userId },
        data: { name: newName }
      });
    }
    
    // Also fix fullName if it has issues
    if (currentFullName && currentFullName.includes('undefined')) {
      console.log(`  Clearing bad fullName: "${currentFullName}"`);
      await prisma.consumerProfile.update({
        where: { id: customer.id },
        data: { fullName: null }
      });
    }
  }
  
  console.log('\n✅ Done! All customer names fixed.');
  await prisma.$disconnect();
}

fixCustomerNames().catch(console.error);
