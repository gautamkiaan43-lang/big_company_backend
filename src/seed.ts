import dotenv from 'dotenv';
dotenv.config();

import prisma from './utils/prisma';
import { hashPassword } from './utils/auth';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create Admin
  const adminPassword = await hashPassword('admin123');
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

  // Create Employee
  const employeePassword = await hashPassword('employee123');
  const employee = await prisma.user.upsert({
    where: { email: 'employee@bigcompany.rw' },
    update: {},
    create: {
      email: 'employee@bigcompany.rw',
      phone: '250788200001',
      password: employeePassword,
      name: 'John Employee',
      role: 'employee',
      employeeProfile: {
        create: {
          employeeNumber: 'EMP001',
          department: 'Sales',
          position: 'Sales Representative'
        }
      }
    }
  });
  console.log('✅ Employee created');

  // Create Wholesaler
  const wholesalerPassword = await hashPassword('wholesaler123');
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
  const retailerPassword = await hashPassword('retailer123');
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
  const consumerPin = await hashPassword('1234');
  const consumerPassword = await hashPassword('1234'); // Same as PIN for simplicity
  const consumer = await prisma.user.upsert({
    where: { phone: '250788123456' },
    update: {},
    create: {
      phone: '250788123456',
      email: 'consumer@bigcompany.rw',
      pin: consumerPin,
      password: consumerPassword, // Added password for email/password login
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

  // Create Consumer 2 (for demo credentials in frontend)
  const consumer2Pin = await hashPassword('1234');
  const consumer2Password = await hashPassword('1234');
  const consumer2 = await prisma.user.upsert({
    where: { phone: '250788100001' },
    update: {},
    create: {
      phone: '250788100001',
      email: 'consumer2@bigcompany.rw',
      pin: consumer2Pin,
      password: consumer2Password,
      name: 'Demo Consumer',
      role: 'consumer',
      consumerProfile: {
        create: {
          walletBalance: 10000,
          rewardsPoints: 50
        }
      }
    }
  });
  console.log('✅ Consumer 2 created');
  
  // Create NFC Cards for Consumers
  await prisma.nfcCard.create({
    data: {
      uid: 'NFC123456',
      pin: '1234',
      status: 'active',
      consumerId: consumer.id,
      balance: 15000
    }
  });

  await prisma.nfcCard.create({
    data: {
      uid: 'NFC789012',
      pin: '1234',
      status: 'active',
      consumerId: consumer2.id,
      balance: 10000
    }
  });
  console.log('✅ NFC Cards created');


  // Get profiles
  const wholesalerProfile = await prisma.wholesalerProfile.findUnique({
    where: { userId: wholesaler.id }
  });

  const retailerProfile = await prisma.retailerProfile.findUnique({
    where: { userId: retailer.id }
  });

  // Create Products for Wholesaler
  const products = [
    { name: 'Rice 25kg', category: 'Grains', price: 35000, stock: 100 },
    { name: 'Cooking Oil 5L', category: 'Oils', price: 12000, stock: 50 },
    { name: 'Sugar 1kg', category: 'Sweeteners', price: 1500, stock: 200 },
    { name: 'Beans 1kg', category: 'Grains', price: 1200, stock: 150 },
    { name: 'Maize Flour 1kg', category: 'Flour', price: 800, stock: 300 }
  ];

  for (const product of products) {
    await prisma.product.create({
      data: {
        ...product,
        wholesalerId: wholesalerProfile!.id
      }
    });
  }
  console.log('✅ Wholesaler products created');

  // Create Products for Retailer
  const retailerProducts = [
    { name: 'Bread', category: 'Bakery', price: 500, stock: 50 },
    { name: 'Milk 1L', category: 'Dairy', price: 1000, stock: 30 },
    { name: 'Eggs (12)', category: 'Dairy', price: 3000, stock: 20 },
    { name: 'Soap', category: 'Hygiene', price: 800, stock: 40 }
  ];

  for (const product of retailerProducts) {
    await prisma.product.create({
      data: {
        ...product,
        retailerId: retailerProfile!.id
      }
    });
  }
  console.log('✅ Retailer products created');

  console.log('🎉 Seeding complete!');
  console.log('\n📋 Demo Credentials:');
  console.log('Admin: admin@bigcompany.rw / admin123');
  console.log('Employee: employee@bigcompany.rw / employee123');
  console.log('Wholesaler: wholesaler@bigcompany.rw / wholesaler123');
  console.log('Retailer: retailer@bigcompany.rw / retailer123');
  console.log('Consumer: 250788123456 / 1234');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
