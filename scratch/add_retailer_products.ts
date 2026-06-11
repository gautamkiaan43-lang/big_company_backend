import prisma from '../src/utils/prisma';

async function main() {
  // 1. Find retailer Corner Shop111
  const retailer = await prisma.retailerProfile.findFirst({
    where: {
      OR: [
        { shopName: { contains: 'Corner Shop' } },
        { user: { name: { contains: 'Corner Shop' } } }
      ]
    },
    include: { user: true }
  });

  if (!retailer) {
    console.error('❌ Retailer not found!');
    return;
  }
  console.log(`✅ Found Retailer: ${retailer.shopName} (ID: ${retailer.id})`);

  // 2. Find Wholesaler products to clone
  const sourceProducts = await prisma.product.findMany({
    where: {
      wholesalerId: { not: null },
      retailerId: null,
      OR: [
        { name: 'abc' },
        { name: 'Standard Corn' }
      ]
    }
  });

  console.log(`✅ Found ${sourceProducts.length} source wholesaler products.`);

  for (const source of sourceProducts) {
    // Determine Retailer pricing structure:
    // costPrice (Retailer Cost) = Wholesaler Price (source.price)
    // price (Retailer Selling Price) = Wholesaler Price * 1.2 (or a reasonable default like 240 for abc, 480 for Standard Corn)
    const costPrice = source.price;
    let price = Math.round(costPrice * 1.2);
    
    // Hardcode matching values from client screenshots if available
    if (source.name === 'abc') {
      price = 240; // Admin had 240 selling price for abc
    } else if (source.name === 'Standard Corn') {
      price = 500; // As per standard corn retailer price in screenshots
    }

    // Check if product already exists for retailer
    const existing = await prisma.product.findFirst({
      where: {
        retailerId: retailer.id,
        name: source.name
      }
    });

    if (existing) {
      console.log(`ℹ️ Product "${source.name}" already exists for retailer. Updating prices/stock.`);
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          costPrice,
          price,
          stock: source.stock, // copy some stock
          status: 'active'
        }
      });
    } else {
      console.log(`➕ Creating product "${source.name}" for retailer.`);
      await prisma.product.create({
        data: {
          name: source.name,
          description: source.description,
          sku: source.sku,
          category: source.category,
          price: price,          // Retailer Selling Price
          costPrice: costPrice,  // Retailer Cost Price
          stock: source.stock,
          unit: source.unit || 'units',
          lowStockThreshold: source.lowStockThreshold || 10,
          status: 'active',
          retailerId: retailer.id,
          image: source.image
        }
      });
    }
  }

  console.log('🎉 Done adding products to Retailer stock!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
