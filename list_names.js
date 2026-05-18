const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const ws = await prisma.wholesalerProfile.findMany({ select: { companyName: true } });
  const rs = await prisma.retailerProfile.findMany({ select: { shopName: true } });
  console.log(JSON.stringify({ wholesalers: ws.map(w => w.companyName), retailers: rs.map(r => r.shopName) }));
}

check().catch(console.error).finally(() => prisma.$disconnect());
