const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'gisozi.wholesaler@big.co.rw' }
  });

  if (!user) {
    console.log('Wholesaler user not found');
    return;
  }

  const profile = await prisma.wholesalerProfile.findUnique({
    where: { userId: user.id }
  });

  if (!profile) {
    console.log('Wholesaler profile not found');
    return;
  }

  console.log('Wholesaler Profile:', profile);

  // 1. Get all orders
  const orders = await prisma.order.findMany({
    where: { wholesalerId: profile.id }
  });
  console.log('\n--- Orders ---');
  console.log(orders.map(o => ({ id: o.id, status: o.status, totalAmount: o.totalAmount, createdAt: o.createdAt })));

  // 2. Get all products
  const products = await prisma.product.findMany({
    where: { wholesalerId: profile.id }
  });
  console.log('\n--- Products ---');
  console.log(products.map(p => ({ id: p.id, name: p.name, price: p.price, costPrice: p.costPrice, stock: p.stock })));

  // 3. Get delivered order items to verify profit calculation
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: { wholesalerId: profile.id }
    },
    include: { product: true, order: true }
  });
  console.log('\n--- Delivered Order Items (Profit Check) ---');
  const deliveredItems = orderItems.filter(item => item.order.status === 'delivered');
  console.log(deliveredItems.map(item => ({
    orderId: item.orderId,
    productId: item.productId,
    quantity: item.quantity,
    price: item.price,
    costPrice: item.product.costPrice,
    calculatedProfit: item.quantity * (item.price - (item.product.costPrice || 0))
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
