const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const credit = await prisma.retailerCredit.findUnique({
    where: { retailerId: 24 }
  });

  if (credit) {
    const updated = await prisma.retailerCredit.update({
      where: { id: credit.id },
      data: {
        availableCredit: 3300
      }
    });
    console.log('Restored credit record:', updated);
  } else {
    console.log('No credit record found for retailer 24');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
