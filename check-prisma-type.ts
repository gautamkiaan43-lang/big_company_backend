
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking Order relation...');
    // This will throw or fail to compile if retailerProfile is invalid
    const o = await prisma.order.findFirst({
        include: {
            retailerProfile: true
        }
    });
    console.log('Order found type safe:', !!o);
    if (o && 'retailerProfile' in o) {
        console.log('✅ retailerProfile exists on Order');
    } else if (o) {
        console.log('❌ retailerProfile MISSING on Order keys:', Object.keys(o));
    }
  } catch (e: any) {
    console.error('❌ Error:', e.message);
  } finally {
      await prisma.$disconnect();
  }
}

main();
