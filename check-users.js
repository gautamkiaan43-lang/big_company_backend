require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      include: {
        retailerProfile: true,
        wholesalerProfile: true,
        consumerProfile: true
      }
    });
    
    console.log(`\n📊 Total users in database: ${users.length}\n`);
    
    users.forEach(user => {
      console.log(`- ${user.role}: ${user.email || user.phone} (${user.name})`);
    });
    
    if (users.length === 0) {
      console.log('\n⚠️  No users found! Database needs to be seeded.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkUsers()
  .finally(async () => {
    await prisma.$disconnect();
  });
