const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.sale.findMany({
    where: { retailerId: 24 }
  });
  console.log('SALES_QUERY_RESULT:');
  console.log(JSON.stringify(sales.map(s => ({
    id: s.id,
    totalAmount: s.totalAmount,
    createdAt: s.createdAt
  })), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
