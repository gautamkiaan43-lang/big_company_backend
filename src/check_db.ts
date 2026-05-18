import prisma from './utils/prisma';

async function check() {
  try {
    const userCount = await prisma.user.count();
    console.log(`Total users in database: ${userCount}`);
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    console.log('Admin user found:', admin ? admin.email : 'None');
  } catch (error) {
    console.error('Connection check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
