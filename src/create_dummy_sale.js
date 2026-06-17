const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findFirst({
    where: { retailerId: 24 }
  });

  if (!product) {
    console.error('No product found for retailer 24');
    return;
  }

  const consumer = await prisma.consumerProfile.findFirst();

  const sale = await prisma.sale.create({
    data: {
      retailerId: 24,
      consumerId: consumer ? consumer.id : null,
      totalAmount: 1500,
      taxAmount: 228.82,
      taxRate: 0.18,
      paymentMethod: 'cash',
      status: 'completed',
      createdAt: new Date(),
      saleItems: {
        create: {
          productId: product.id,
          quantity: 1,
          price: 1500,
          costPrice: product.costPrice || 1000
        }
      }
    }
  });

  console.log('Dummy sale created successfully:', sale);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
