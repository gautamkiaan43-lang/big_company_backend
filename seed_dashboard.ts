
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding dashboard data...');

  // Get existing profiles
  const consumers = await prisma.consumerProfile.findMany();
  const retailers = await prisma.retailerProfile.findMany();

  if (consumers.length === 0 || retailers.length === 0) {
    console.error('Please ensure you have at least one consumer and one retailer first.');
    return;
  }

  const cid = consumers[0].id;
  const rid = retailers[0].id;

  // Create historical sales and transactions for the last 30 days
  const now = new Date();
  
  for (let i = 0; i < 60; i++) {
    const date = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const amount = Math.floor(Math.random() * 50000) + 5000;
    
    // Create a sale
    await prisma.sale.create({
      data: {
        retailerId: rid,
        consumerId: cid,
        status: i % 10 === 0 ? 'pending' : 'completed',
        totalAmount: amount,
        paymentMethod: i % 3 === 0 ? 'nfc' : 'wallet',
        createdAt: date
      }
    });

    // Create a wallet transaction for the same
    const wallet = await prisma.wallet.findFirst({ where: { consumerId: cid } });
    if (wallet) {
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: i % 5 === 0 ? 'top_up' : 'gas_payment',
          amount: amount,
          description: `Transaction ${i}`,
          status: 'completed',
          createdAt: date
        }
      });
    }

    // Occasional loans
    if (i % 8 === 0) {
      await prisma.loan.create({
        data: {
          consumerId: cid,
          amount: Math.floor(Math.random() * 20000) + 10000,
          status: i % 16 === 0 ? 'pending' : 'active',
          dueDate: new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000),
          createdAt: date
        }
      });
    }

    // Occasional gas topups
    if (i % 6 === 0) {
      const meter = await prisma.gasMeter.findFirst({ where: { consumerId: cid } });
      if (meter) {
        await prisma.gasTopup.create({
          data: {
            consumerId: cid,
            meterId: meter.id,
            amount: amount / 2,
            units: amount / 1000,
            status: 'completed',
            createdAt: date
          }
        });
      }
    }
  }

  console.log('Seeding completed!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
