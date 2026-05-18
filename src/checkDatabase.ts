import prisma from './utils/prisma';

async function checkDatabase() {
  console.log('🔍 Checking Database Schema and Data...\n');

  try {
    // 1. Check if there are any consumer profiles
    const consumerCount = await prisma.consumerProfile.count();
    console.log(`📊 Total Consumer Profiles: ${consumerCount}`);

    // 2. Check wallet table structure by trying to query
    console.log('\n💰 Checking Wallet Table...');
    const walletCount = await prisma.wallet.count();
    console.log(`Total Wallets: ${walletCount}`);

    // 3. Get a sample consumer with wallets
    const sampleConsumer = await prisma.consumerProfile.findFirst({
      include: {
        wallets: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (sampleConsumer) {
      console.log('\n👤 Sample Consumer:');
      console.log(JSON.stringify(sampleConsumer, null, 2));
    } else {
      console.log('\n⚠️  No consumer profiles found in database!');
    }

    // 4. Check for wallet transactions
    const txCount = await prisma.walletTransaction.count();
    console.log(`\n💸 Total Wallet Transactions: ${txCount}`);

  } catch (error: any) {
    console.error('\n❌ Database Error:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    if (error.meta) {
      console.error('Meta:', JSON.stringify(error.meta, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
