import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function approveAllPendingTopups() {
  console.log('🔍 Searching for pending retailer top-ups...');
  
  const pendingTransactions = await prisma.walletTransaction.findMany({
    where: { 
      status: 'pending',
      type: 'topup',
      retailerId: { not: null }
    }
  });

  if (pendingTransactions.length === 0) {
    console.log('✅ No pending transactions found.');
    return;
  }

  console.log(`Found ${pendingTransactions.length} transactions. Processing...`);

  for (const tx of pendingTransactions) {
    try {
      await prisma.$transaction([
        // 1. Mark transaction as completed
        prisma.walletTransaction.update({
          where: { id: tx.id },
          data: { status: 'completed' }
        }),
        // 2. Increment the retailer's balance
        prisma.retailerProfile.update({
          where: { id: tx.retailerId! },
          data: { walletBalance: { increment: tx.amount } }
        })
      ]);
      console.log(`✅ Approved: ${tx.amount} RWF for Retailer ID: ${tx.retailerId} (Ref: ${tx.reference})`);
    } catch (err) {
      console.error(`❌ Failed to approve transaction ${tx.id}:`, err);
    }
  }
}

approveAllPendingTopups()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
