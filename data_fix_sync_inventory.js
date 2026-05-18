
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncMissingInventory() {
  const retailerId = 1; // Corner Shop111
  console.log(`Starting inventory sync for Retailer ID: ${retailerId}...`);

  try {
    // 1. Find all DELIVERED orders for this retailer
    const deliveredOrders = await prisma.order.findMany({
      where: {
        retailerId: retailerId,
        status: 'delivered'
      },
      include: {
        orderItems: {
          include: {
            product: true // This is the wholesaler's product template
          }
        }
      }
    });

    console.log(`Found ${deliveredOrders.length} delivered orders.`);

    for (const order of deliveredOrders) {
      console.log(`Processing Order #${order.id}...`);

      for (const item of order.orderItems) {
        if (!item.product) continue;

        // 2. Check if this product exists in retailer inventory
        // Match by Name (since barcode/sku might be null)
        const existing = await prisma.product.findFirst({
          where: {
            retailerId: retailerId,
            OR: [
              item.product.barcode ? { barcode: item.product.barcode } : { id: -1 },
              item.product.sku ? { sku: item.product.sku } : { id: -1 },
              { name: item.product.name }
            ]
          }
        });

        if (existing) {
          console.log(`Product "${item.product.name}" already exists. Ensuring it is active.`);
          await prisma.product.update({
            where: { id: existing.id },
            data: { status: 'active' } // Make sure it's active
          });
        } else {
          console.log(`Creating missing product: "${item.product.name}" with stock: ${item.quantity}`);
          await prisma.product.create({
            data: {
                    name: item.product.name,
              description: item.product.description,
              sku: item.product.sku,
              barcode: item.product.barcode,
              category: item.product.category,
              price: item.product.price * 1.2, // Default 20% markup
              costPrice: item.product.price,
              stock: item.quantity,
              retailerId: retailerId,
              unit: item.product.unit,
              image: item.product.image,
              status: 'active'
            }
          });
        }
      }
    }

    console.log('Sync completed successfully!');
  } catch (error) {
    console.error('Error during sync:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncMissingInventory();
