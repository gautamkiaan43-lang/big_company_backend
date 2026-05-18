
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Get a retailer
  const retailer = await prisma.retailerProfile.findFirst();
  if (!retailer) {
    console.error('No retailer found! Please log in/create account first.');
    return;
  }

  // 2. Get a wholesaler product to order
  const product = await prisma.product.findFirst({
    where: { wholesalerId: { not: null } }
  });
  if (!product || !product.wholesalerId) {
    console.error('No wholesaler products found.');
    return;
  }

  // 3. Create the order
  const order = await prisma.order.create({
    data: {
      retailerId: retailer.id,
      wholesalerId: product.wholesalerId,
      totalAmount: product.costPrice ? product.costPrice * 10 : 1000,
      status: 'pending',
      orderItems: {
        create: {
          productId: product.id,
          quantity: 10,
          price: product.costPrice || 100
        }
      }
    }
  });

  console.log('SUCCESS! Created Test Order.');
  console.log('--------------------------------------------------');
  console.log(`ORDER ID (Invoice Number): ${order.id}`);
  console.log('--------------------------------------------------');
  console.log('Copy the above ID and use it in "Add from Invoice".');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
