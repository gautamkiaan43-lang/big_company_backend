// Script to link retailers to wholesaler for testing
// Run: node scripts/linkRetailersToWholesaler.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Linking retailers to wholesaler...\n');

  // Get all retailers
  const retailers = await prisma.retailerProfile.findMany();

  // Get first wholesaler
  const wholesaler = await prisma.wholesalerProfile.findFirst();

  if (!wholesaler) {
    console.log('No wholesaler found in database!');
    return;
  }

  console.log('Wholesaler:', wholesaler.companyName, '(ID:', wholesaler.id + ')');
  console.log('');

  for (const retailer of retailers) {
    if (!retailer.linkedWholesalerId) {
      await prisma.retailerProfile.update({
        where: { id: retailer.id },
        data: { linkedWholesalerId: wholesaler.id }
      });
      console.log('✓ Linked:', retailer.shopName, '-> Wholesaler ID:', wholesaler.id);
    } else {
      console.log('- Already linked:', retailer.shopName, '-> Wholesaler ID:', retailer.linkedWholesalerId);
    }
  }

  console.log('\nDone!');
  await prisma.$disconnect();
}

main().catch(console.error);
