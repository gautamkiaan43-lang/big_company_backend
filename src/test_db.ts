import prisma from './utils/prisma';

async function test() {
  console.log('STARTING TEST');
  try {
    const userCount = await prisma.user.count();
    console.log('USER COUNT:', userCount);
    
    const consumer = await prisma.consumerProfile.findFirst({
      where: { userId: 6 } // Kapil's user ID
    });
    console.log('CONSUMER:', consumer?.id, consumer?.fullName);

    if (consumer) {
       const link = await prisma.customerLinkRequest.findUnique({
         where: {
           customerId_retailerId: {
             customerId: consumer.id,
             retailerId: 1
           }
         }
       });
       console.log('LINK REQUEST:', link);
    }
  } catch (err: any) {
    console.error('TEST ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();
