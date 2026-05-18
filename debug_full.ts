import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'retailer' },
    include: { retailerProfile: true }
  });
  console.log('Retailer Users (' + users.length + '):');
  users.forEach(u => {
    console.log(`User: ${u.id}, Email: ${u.email}, Phone: ${u.phone}, Name: ${u.name}, Active: ${u.isActive}`);
    if (u.retailerProfile) {
      console.log(`  Profile: ${u.retailerProfile.id}, Shop: ${u.retailerProfile.shopName}`);
    } else {
      console.log(`  NO PROFILE FOUND`);
    }
  });

  const profiles = await prisma.retailerProfile.findMany({
    include: { user: true }
  });
  console.log('\nRetailer Profiles (' + profiles.length + '):');
  profiles.forEach(p => {
    console.log(`Profile: ${p.id}, Shop: ${p.shopName}, User ID: ${p.userId}`);
    if (p.user) {
      console.log(`  User: ${p.user.email}, Active: ${p.user.isActive}`);
    } else {
      console.log(`  NO USER FOUND`);
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
