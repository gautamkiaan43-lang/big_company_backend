import prisma from './utils/prisma';

async function fixAllCustomerNames() {
  console.log('🔧 Comprehensive Customer Name Fix\n');
  console.log('=' .repeat(50));
  
  const customers = await prisma.consumerProfile.findMany({
    include: { user: true },
    orderBy: { id: 'asc' }
  });

  console.log(`\nFound ${customers.length} customers\n`);
  
  let fixedCount = 0;
  
  for (const customer of customers) {
    const currentName = customer.user.name;
    const currentFullName = customer.fullName;
    const phone = customer.user.phone;
    const email = customer.user.email;
    
    let needsFix = false;
    let newName = currentName;
    let newFullName = currentFullName;
    
    // Check if name has issues
    if (!currentName || 
        currentName.includes('undefined') || 
        currentName.trim() === '' ||
        currentName === phone) {
      
      // Try to extract name from email
      if (email && email.includes('@')) {
        const emailName = email.split('@')[0];
        // Convert email name to proper case (e.g., "john.doe" -> "John Doe")
        newName = emailName
          .split(/[._-]/)
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
      } else {
        // Use phone as last resort
        newName = phone;
      }
      
      needsFix = true;
    }
    
    // Check if fullName has issues
    if (currentFullName && currentFullName.includes('undefined')) {
      newFullName = null;
      needsFix = true;
    }
    
    if (needsFix) {
      console.log(`\n📝 Fixing Customer ID: ${customer.id}`);
      console.log(`   Old name: "${currentName}"`);
      console.log(`   New name: "${newName}"`);
      if (currentFullName !== newFullName) {
        console.log(`   Old fullName: "${currentFullName}"`);
        console.log(`   New fullName: ${newFullName || 'null'}`);
      }
      
      // Update user name
      await prisma.user.update({
        where: { id: customer.userId },
        data: { name: newName }
      });
      
      // Update fullName if needed
      if (currentFullName !== newFullName) {
        await prisma.consumerProfile.update({
          where: { id: customer.id },
          data: { fullName: newFullName }
        });
      }
      
      fixedCount++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`\n✅ Fixed ${fixedCount} out of ${customers.length} customers`);
  console.log('\n📋 Final Customer List:\n');
  
  // Show final results
  const updatedCustomers = await prisma.consumerProfile.findMany({
    include: { user: true },
    orderBy: { id: 'asc' }
  });
  
  updatedCustomers.forEach((c, i) => {
    console.log(`${i + 1}. ${c.user.name} (${c.user.phone})`);
  });
  
  await prisma.$disconnect();
}

fixAllCustomerNames().catch(console.error);
