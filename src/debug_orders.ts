
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('--- DB ORDER CHECK ---');
  if (orders.length === 0) {
    console.log('No orders found in database.');
  } else {
    orders.forEach(o => console.log(`Order ID: "${o.id}" (Retailer: ${o.retailerId}, Status: ${o.status})`));
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
