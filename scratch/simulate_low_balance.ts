
import { PrismaClient } from '@prisma/client';
import { emailQueue } from '../src/queues/email.queue';
import { TemplateService } from '../src/services/template.service';

const prisma = new PrismaClient();

async function simulateLowBalance() {
  console.log('🧪 Starting Low Balance Simulation...');

  // 1. Find the retailer "mssi"
  const retailer = await prisma.retailerProfile.findFirst({
    where: { shopName: 'mssi' },
    include: { user: true }
  });

  if (!retailer || !retailer.user?.email) {
    console.error('❌ Retailer "mssi" not found or has no email.');
    return;
  }

  console.log(`📍 Found Retailer: ${retailer.shopName} (${retailer.user.email})`);
  console.log(`💰 Current Balance: ${retailer.walletBalance} RWF`);

  // 2. Reduce balance to 4,000 RWF
  const newBalance = 4000;
  await prisma.retailerProfile.update({
    where: { id: retailer.id },
    data: { walletBalance: newBalance }
  });

  console.log(`📉 Balance reduced to: ${newBalance} RWF`);

  // 3. Manually Trigger the Email (Simulating the end of createOrder)
  console.log('📧 Queueing Low Balance Alert...');
  
  await emailQueue.add('wallet-balance-low', {
    to: retailer.user.email,
    subject: '⚠️ Wallet Balance Low',
    html: TemplateService.getWalletNotificationTemplate('LOW_BALANCE', 0, newBalance),
    templateType: 'RETAILER_WALLET_WARNING'
  });

  console.log('✅ Simulation Complete! Check your terminal and Email Monitoring dashboard.');
}

simulateLowBalance()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
