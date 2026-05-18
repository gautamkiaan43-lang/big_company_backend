import prisma from './utils/prisma';

async function quickFix() {
  console.log('⚡ Quick Fix: Updating all "undefined undefined" names\n');
  
  // Find all users with "undefined" in name
  const badUsers = await prisma.user.findMany({
    where: {
      name: {
        contains: 'undefined'
      }
    },
    include: {
      consumerProfile: true
    }
  });

  console.log(`Found ${badUsers.length} users with bad names\n`);

  for (const user of badUsers) {
    let newName = user.phone; // Default fallback
    
    // Try to get name from email
    if (user.email && user.email.includes('@')) {
      const emailPart = user.email.split('@')[0];
      newName = emailPart
        .split(/[._-]/)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join(' ');
    }
    
    console.log(`Fixing: "${user.name}" → "${newName}"`);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { name: newName }
    });
    
    // Also clear bad fullName
    if (user.consumerProfile && user.consumerProfile.fullName?.includes('undefined')) {
      await prisma.consumerProfile.update({
        where: { id: user.consumerProfile.id },
        data: { fullName: null }
      });
    }
  }

  console.log(`\n✅ Fixed ${badUsers.length} customers!`);
  await prisma.$disconnect();
}

quickFix().catch(console.error);
