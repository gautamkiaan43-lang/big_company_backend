import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://root:gQxwAOSxaWhwCMjsgnSQBEYBlZxnReva@centerbeam.proxy.rlwy.net:23787/railway"
    }
  }
});

async function main() {
  console.log('🚀 Starting Robust Account Cleanup with Verbose Logging...');

  const keepUserIds = [1, 51, 54, 56];

  const tablesToDelete = [
    { name: 'attendance', action: () => prisma.attendance.deleteMany({}) },
    { name: 'billPayment', action: () => prisma.billPayment.deleteMany({}) },
    { name: 'lessonProgress', action: () => prisma.lessonProgress.deleteMany({}) },
    { name: 'courseEnrollment', action: () => prisma.courseEnrollment.deleteMany({}) },
    { name: 'projectMember', action: () => prisma.projectMember.deleteMany({}) },
    { name: 'task', action: () => prisma.task.deleteMany({}) },
    { name: 'project', action: () => prisma.project.deleteMany({}) },
    { name: 'leaveRequest', action: () => prisma.leaveRequest.deleteMany({}) },
    { name: 'walletTransaction', action: () => prisma.walletTransaction.deleteMany({}) },
    { name: 'gasReward', action: () => prisma.gasReward.deleteMany({}) },
    { name: 'gasTopup', action: () => prisma.gasTopup.deleteMany({}) },
    { name: 'gasRechargeTransaction', action: () => prisma.gasRechargeTransaction.deleteMany({}) },
    { name: 'saleItem', action: () => prisma.saleItem.deleteMany({}) },
    { name: 'sale', action: () => prisma.sale.deleteMany({}) },
    { name: 'customerOrder', action: () => prisma.customerOrder.deleteMany({}) },
    { name: 'loan', action: () => prisma.loan.deleteMany({}) },
    { name: 'orderItem', action: () => prisma.orderItem.deleteMany({}) },
    { name: 'profitInvoice', action: () => prisma.profitInvoice.deleteMany({}) },
    { name: 'order', action: () => prisma.order.deleteMany({}) },
    { name: 'creditRequest', action: () => prisma.creditRequest.deleteMany({}) },
    { name: 'settlementInvoice', action: () => prisma.settlementInvoice.deleteMany({}) },
    { name: 'linkRequest', action: () => prisma.linkRequest.deleteMany({}) },
    { name: 'customerLinkRequest', action: () => prisma.customerLinkRequest.deleteMany({}) },
    { name: 'message', action: () => prisma.message.deleteMany({}) },
    { name: 'notification', action: () => prisma.notification.deleteMany({}) },
    { name: 'supplierPayment', action: () => prisma.supplierPayment.deleteMany({}) },
    { name: 'supplier', action: () => prisma.supplier.deleteMany({}) },
    { name: 'terminal', action: () => prisma.terminal.deleteMany({}) },
    { name: 'branch', action: () => prisma.branch.deleteMany({}) },
    { name: 'gasMeter', action: () => prisma.gasMeter.deleteMany({}) },
    { name: 'nfcCard', action: () => prisma.nfcCard.deleteMany({}) },
    { name: 'retailerCredit', action: () => prisma.retailerCredit.deleteMany({}) }
  ];

  for (const table of tablesToDelete) {
    try {
      console.log(`🧹 Cleaning table: ${table.name}...`);
      const res = await table.action();
      console.log(`✅ Table: ${table.name} cleaned. Count: ${res.count}`);
    } catch (e: any) {
      console.error(`❌ Error cleaning table: ${table.name}:`, e.message || e);
    }
  }

  // Delete profiles
  try {
    console.log('🧹 Deleting other users employeeProfile...');
    await prisma.employeeProfile.deleteMany({ where: { userId: { notIn: keepUserIds } } });
    
    console.log('🧹 Deleting other users consumerSettings...');
    await prisma.consumerSettings.deleteMany({ where: { consumerProfile: { userId: { notIn: keepUserIds } } } });
    
    console.log('🧹 Deleting other users consumerProfile...');
    await prisma.consumerProfile.deleteMany({ where: { userId: { notIn: keepUserIds } } });
    
    console.log('🧹 Deleting other users retailerProfile...');
    await prisma.retailerProfile.deleteMany({ where: { userId: { notIn: keepUserIds } } });
    
    console.log('🧹 Deleting other users wholesalerSettings...');
    await prisma.wholesalerSettings.deleteMany({ where: { wholesalerProfile: { userId: { notIn: keepUserIds } } } });
    
    console.log('🧹 Deleting other users wholesalerProfile...');
    await prisma.wholesalerProfile.deleteMany({ where: { userId: { notIn: keepUserIds } } });

    console.log('🧹 Deleting other users user...');
    const delUsers = await prisma.user.deleteMany({ where: { id: { notIn: keepUserIds } } });
    console.log(`✅ Deleted ${delUsers.count} dummy user accounts.`);
  } catch (e: any) {
    console.error('❌ Error during profile/user deletion:', e.message || e);
  }

  // Setup Kept Users
  try {
    const consumer = await prisma.consumerProfile.findFirst({ where: { userId: 56 } });
    const retailer = await prisma.retailerProfile.findFirst({ where: { userId: 51 } });
    const wholesaler = await prisma.wholesalerProfile.findFirst({ where: { userId: 54 } });

    if (!consumer || !retailer || !wholesaler) {
      console.error('❌ Missing essential profiles (Consumer 56, Retailer 51, Wholesaler 54).');
      return;
    }

    console.log('🔧 Updating Retailer Profile...');
    await prisma.retailerProfile.update({
      where: { id: retailer.id },
      data: {
        walletBalance: 100000.0,
        shopName: 'BBB SHOP CORNER',
        isVerified: true,
        linkedWholesalerId: wholesaler.id
      }
    });

    console.log('🔧 Updating Wholesaler Profile...');
    await prisma.wholesalerProfile.update({
      where: { id: wholesaler.id },
      data: {
        companyName: 'Gisozi wholesaler',
        isVerified: true
      }
    });

    console.log('🔧 Updating Consumer Profile...');
    await prisma.consumerProfile.update({
      where: { id: consumer.id },
      data: {
        linkedRetailerId: retailer.id,
        fullName: 'Suleyiman',
        isVerified: true
      }
    });

    console.log('🔗 Creating approved customer link request...');
    await prisma.customerLinkRequest.upsert({
      where: {
        customerId_retailerId: {
          customerId: consumer.id,
          retailerId: retailer.id
        }
      },
      update: { status: 'approved' },
      create: {
        customerId: consumer.id,
        retailerId: retailer.id,
        status: 'approved'
      }
    });

    console.log('💰 Setting up Consumer Wallet...');
    const wallet = await prisma.wallet.findFirst({
      where: { consumerId: consumer.id, type: 'dashboard_wallet' }
    });
    if (wallet) {
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: 100000.0 }
      });
    } else {
      await prisma.wallet.create({
        data: {
          consumerId: consumer.id,
          type: 'dashboard_wallet',
          balance: 100000.0,
          currency: 'RWF'
        }
      });
    }

    console.log('📦 Cleaning and setting up wholesaler products...');
    await prisma.product.deleteMany({
      where: {
        OR: [
          { wholesalerId: wholesaler.id },
          { retailerId: { not: null } }
        ]
      }
    });

    await prisma.product.createMany({
      data: [
        {
          name: 'Premium Cooking Gas 12kg',
          category: 'Gas',
          price: 15000,
          costPrice: 12000,
          stock: 500,
          wholesalerId: wholesaler.id,
          unit: 'cylinder',
          status: 'active'
        },
        {
          name: 'LPG Gas Regulator',
          category: 'Accessories',
          price: 5000,
          costPrice: 3500,
          stock: 200,
          wholesalerId: wholesaler.id,
          unit: 'pcs',
          status: 'active'
        },
        {
          name: 'Safety Hose Pipe 2m',
          category: 'Accessories',
          price: 3000,
          costPrice: 2000,
          stock: 300,
          wholesalerId: wholesaler.id,
          unit: 'pcs',
          status: 'active'
        }
      ]
    });

    console.log('✅ Real Testing Setup completed successfully!');
  } catch (e: any) {
    console.error('❌ Error setting up profiles/wallets:', e.message || e);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
