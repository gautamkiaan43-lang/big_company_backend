
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkData() {
  const models = [
    'user',
    'consumerProfile',
    'retailerProfile',
    'wholesalerProfile',
    'loan',
    'sale',
    'walletTransaction',
    'nfcCard',
    'gasTopup'
  ];

  console.log('--- DATABASE DATA AUDIT ---');
  for (const model of models) {
    try {
      // @ts-ignore
      const count = await prisma[model].count();
      console.log(`${model}: ${count}`);
    } catch (e) {
      console.log(`${model}: FAILED TO QUERY`);
    }
  }
}

checkData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
