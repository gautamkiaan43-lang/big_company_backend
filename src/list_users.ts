import prisma from './utils/prisma';

async function list() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, phone: true, role: true }
  });
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}
list();
