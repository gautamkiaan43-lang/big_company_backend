
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'sam123.retailer@big.co.rw' }
  });
  console.log('TEMP_PASSWORD:', user.tempPassword);
}

main().finally(() => prisma.$disconnect());
