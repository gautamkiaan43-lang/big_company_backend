import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function main() {
  const retailers = await prisma.retailerProfile.findMany();
  let output = 'Retailers:\n';
  retailers.forEach(r => {
    output += `PRO_ID:${r.id}\n`;
    output += `SHOP:${r.shopName}\n`;
    output += `USER_ID:${r.userId}\n`;
  });
  fs.writeFileSync('ids_dump.txt', output, 'utf8');
  console.log('Dump complete');
}

main().catch(console.error).finally(() => prisma.$disconnect());
