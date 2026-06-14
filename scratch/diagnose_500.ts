import { PrismaClient } from '@prisma/client';

const LIVE_DB_URL = "mysql://root:gQxwAOSxaWhwCMjsgnSQBEYBlZxnReva@centerbeam.proxy.rlwy.net:23787/railway";

async function diagnose() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: LIVE_DB_URL
      }
    }
  });

  const userId = 56;

  console.log('--- 1. Testing getCustomerProfile Query ---');
  try {
    const consumerProfile = await prisma.consumerProfile.findUnique({
        where: { userId },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    name: true
                }
            },
            wallets: true,
            customerLinkRequests: {
                where: { status: 'approved' },
                include: {
                    retailer: {
                        include: {
                            user: {
                                select: {
                                    phone: true,
                                    email: true,
                                }
                            }
                        }
                    }
                }
            },
            sales: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: {
                    retailerProfile: {
                        include: {
                            user: {
                                select: {
                                    phone: true,
                                    email: true,
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    console.log('getCustomerProfile Query Succeeded!');
  } catch (err: any) {
    console.error('getCustomerProfile Query Failed:', err.message || err);
  }

  console.log('\n--- 2. Testing getMyOrders Query Part 1 (sales) ---');
  try {
    const consumerProfile = await prisma.consumerProfile.findUnique({
      where: { userId }
    });

    if (!consumerProfile) {
      console.log('Consumer Profile not found!');
      return;
    }

    const sales = await prisma.sale.findMany({
      where: { consumerId: consumerProfile.id },
      include: {
        saleItems: {
          include: { product: true }
        },
        retailerProfile: {
          select: {
            id: true,
            shopName: true,
            address: true,
            user: { select: { phone: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`sales query succeeded! Found ${sales.length} sales.`);
  } catch (err: any) {
    console.error('sales query failed:', err.message || err);
  }

  console.log('\n--- 3. Testing getMyOrders Query Part 2 (customerOrder) ---');
  try {
    const consumerProfile = await prisma.consumerProfile.findUnique({
      where: { userId }
    });

    if (!consumerProfile) {
      console.log('Consumer Profile not found!');
      return;
    }

    const otherOrders = await prisma.customerOrder.findMany({
      where: { consumerId: consumerProfile.id },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`customerOrder query succeeded! Found ${otherOrders.length} orders.`);
  } catch (err: any) {
    console.error('customerOrder query failed:', err.message || err);
  }

  await prisma.$disconnect();
}

diagnose();
