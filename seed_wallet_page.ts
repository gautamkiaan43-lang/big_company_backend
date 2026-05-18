
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function run() {
  const phone = '250123456789';
  const pin = '1234';
  const email = 'demo_consumer@bigcompany.rw';
  
  const hashedPin = await bcrypt.hash(pin, 10);

  // 1. Create/Update User
  const user = await prisma.user.upsert({
    where: { email },
    update: { pin: hashedPin },
    create: {
      id: crypto.randomUUID(),
      email,
      phone,
      name: 'Demo Consumer',
      role: 'consumer',
      pin: hashedPin
    }
  });

  // 2. Create/Update Consumer Profile
  const profile = await prisma.consumerProfile.upsert({
    where: { userId: user.id },
    update: { fullName: 'Demo Consumer' },
    create: {
      id: crypto.randomUUID(),
      userId: user.id,
      fullName: 'Demo Consumer',
      address: 'Kigali, Rwanda',
      isVerified: true
    }
  });

  // 3. Create Wallets if they don't exist
  const dashboardWallet = await prisma.wallet.upsert({
    where: { id: `dw-${profile.id}` }, // Fixed ID for seed consistency
    update: { balance: 50000 },
    create: {
      id: `dw-${profile.id}`,
      consumerId: profile.id,
      type: 'dashboard_wallet',
      balance: 50000,
      currency: 'RWF'
    }
  });

  const creditWallet = await prisma.wallet.upsert({
    where: { id: `cw-${profile.id}` },
    update: { balance: 10000 },
    create: {
      id: `cw-${profile.id}`,
      consumerId: profile.id,
      type: 'credit_wallet',
      balance: 10000,
      currency: 'RWF'
    }
  });

  // 4. Add some transactions
  await prisma.walletTransaction.createMany({
    data: [
      {
        id: crypto.randomUUID(),
        walletId: dashboardWallet.id,
        type: 'topup',
        amount: 50000,
        description: 'Monthly Salary Topup',
        status: 'completed'
      },
      {
        id: crypto.randomUUID(),
        walletId: dashboardWallet.id,
        type: 'gas_payment',
        amount: -15000,
        description: 'Gas Purchase #9872',
        status: 'completed'
      }
    ]
  });

  // 5. Link an NFC Card
  const cardUid = 'ABC123DEF456';
  await prisma.nfcCard.upsert({
    where: { uid: cardUid },
    update: { consumerId: profile.id, status: 'active' },
    create: {
      id: crypto.randomUUID(),
      uid: cardUid,
      consumerId: profile.id,
      status: 'active',
      balance: 0
    }
  });

  // 6. Add a Loan
  await prisma.loan.create({
    data: {
      id: crypto.randomUUID(),
      consumerId: profile.id,
      amount: 25000,
      status: 'active',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  console.log('✅ Wallet Page Data Seeded Successfully!');
  console.log('User Login: 250123456789 / 1234');
}

run().catch(console.error).finally(() => prisma.$disconnect());
