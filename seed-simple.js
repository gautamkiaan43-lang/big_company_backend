require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create Admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@bigcompany.rw' },
      update: {},
      create: {
        email: 'admin@bigcompany.rw',
        password: adminPassword,
        name: 'System Administrator',
        role: 'admin'
      }
    });
    console.log('✅ Admin created');

    // Create Wholesaler
    const wholesalerPassword = await bcrypt.hash('wholesaler123', 10);
    const wholesaler = await prisma.user.upsert({
      where: { email: 'wholesaler@bigcompany.rw' },
      update: {},
      create: {
        email: 'wholesaler@bigcompany.rw',
        phone: '250788300001',
        password: wholesalerPassword,
        name: 'Big Wholesale Co.',
        role: 'wholesaler',
        wholesalerProfile: {
          create: {
            companyName: 'Big Wholesale Co.',
            address: 'Kigali, Rwanda'
          }
        }
      }
    });
    console.log('✅ Wholesaler created');

    // Create Retailer
    const retailerPassword = await bcrypt.hash('retailer123', 10);
    const retailer = await prisma.user.upsert({
      where: { email: 'retailer@bigcompany.rw' },
      update: {},
      create: {
        email: 'retailer@bigcompany.rw',
        phone: '250788400001',
        password: retailerPassword,
        name: 'Corner Shop',
        role: 'retailer',
        retailerProfile: {
          create: {
            shopName: 'Corner Shop',
            address: 'Kigali, Rwanda',
            creditLimit: 100000,
            walletBalance: 50000
          }
        }
      }
    });
    console.log('✅ Retailer created');

    // Create Consumer
    const consumerPin = await bcrypt.hash('1234', 10);
    const consumerPassword = await bcrypt.hash('1234', 10);
    const consumer = await prisma.user.upsert({
      where: { phone: '250788123456' },
      update: {},
      create: {
        phone: '250788123456',
        email: 'consumer@bigcompany.rw',
        pin: consumerPin,
        password: consumerPassword,
        name: 'Jane Consumer',
        role: 'consumer',
        consumerProfile: {
          create: {
            walletBalance: 25000,
            rewardsPoints: 150
          }
        }
      }
    });
    console.log('✅ Consumer created');

    console.log('\n🎉 Seeding complete!');
    console.log('\n📋 Demo Credentials:');
    console.log('Admin: admin@bigcompany.rw / admin123');
    console.log('Wholesaler: wholesaler@bigcompany.rw / wholesaler123');
    console.log('Retailer: retailer@bigcompany.rw / retailer123');
    console.log('Consumer: 250788123456 / 1234 (or consumer@bigcompany.rw / 1234)');
  } catch (error) {
    console.error('Error seeding:', error);
    throw error;
  }
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
