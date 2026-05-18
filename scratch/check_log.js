const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  try {
    const log = await prisma.systemEmailLog.findFirst({
      orderBy: { id: 'desc' }
    });
    console.log('Latest Email Log:', JSON.stringify(log, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
check();
