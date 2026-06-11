const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://root:@localhost:3306/big_company"
    }
  }
});

async function main() {
  const rawProducts = await prisma.product.findMany({
    include: {
      retailerProfile: true,
      wholesalerProfile: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const groupedMap = new Map();

  rawProducts.forEach(product => {
    const key = product.sku || product.name;
    if (!groupedMap.has(key)) {
      groupedMap.set(key, { ...product });
    } else {
      const existing = groupedMap.get(key);
      if (existing.retailerId !== null && product.retailerId === null) {
        const aggregatedStock = existing.stock + product.stock;
        Object.assign(existing, product);
        existing.stock = aggregatedStock;
      } else {
        existing.stock += product.stock;
      }
    }
  });

  const products = Array.from(groupedMap.values());
  const soap = products.find(p => p.name === 'Soap');
  console.log('AGGREGATED SOAP PRODUCT:', JSON.stringify(soap, null, 2));
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
