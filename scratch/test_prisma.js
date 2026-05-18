const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    const count = await prisma.emailTemplate.count();
    console.log('Template count:', count);
    const logs = await prisma.systemEmailLog.findMany({ take: 1 });
    console.log('Log table accessible');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();
