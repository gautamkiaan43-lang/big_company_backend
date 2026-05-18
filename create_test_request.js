const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const retailer = await prisma.retailerProfile.findFirst({
      where: { shopName: 'Corner Shop111' }
    });
    
    // Using the name from the DB list
    const wholesaler = await prisma.wholesalerProfile.findFirst({
      where: { companyName: 'Big Wholesale Co.' }
    });
    
    if (!retailer || !wholesaler) {
        console.log('Retailer or Wholesaler not found');
        return;
    }

    // Create a pending credit request
    const request = await prisma.creditRequest.create({
        data: {
            retailerId: retailer.id,
            amount: 50000,
            reason: 'Test credit request for history verification',
            status: 'pending'
        }
    });
    
    console.log('✅ Created pending credit request ID:', request.id);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
