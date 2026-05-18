import prisma from './utils/prisma';

async function seedCompleteData() {
    console.log('🌱 Seeding complete sample dataset...');

    try {
        const wholesaler = await prisma.wholesalerProfile.findFirst();
        if (!wholesaler) {
            console.log('❌ No wholesaler found');
            return;
        }

        // 1. Get or create a retailer user
        let retailerUser = await prisma.user.findFirst({ where: { role: 'retailer' } });
        if (!retailerUser) {
            console.log('👤 Creating sample retailer user...');
            retailerUser = await prisma.user.create({
                data: {
                    phone: '250788200001',
                    password: 'password123',
                    name: 'Demo Retailer',
                    role: 'retailer'
                }
            });
        }

        // 2. Get or create a retailer profile
        let retailerProfile = await prisma.retailerProfile.findUnique({ where: { userId: retailerUser.id } });
        if (!retailerProfile) {
            console.log('🏪 Creating retailer profile...');
            retailerProfile = await prisma.retailerProfile.create({
                data: {
                    userId: retailerUser.id,
                    shopName: 'Demo Retailer Shop'
                }
            });
        }

        // 3. Create a COMPLETED order
        console.log('📦 Creating completed order...');
        const order = await prisma.order.create({
            data: {
                retailerId: retailerProfile.id,
                wholesalerId: wholesaler.id,
                totalAmount: 1200000,
                status: 'completed'
            }
        });

        // 4. Create Profit Invoice
        console.log('💰 Creating profit invoice...');
        const invoice = await prisma.profitInvoice.create({
            data: {
                orderId: order.id,
                profitAmount: 180000,
                invoiceNumber: 'PROF-INV-2024-Verified',
                generatedAt: new Date()
            }
        });

        console.log(`✅ Success! Created Invoice: ${invoice.invoiceNumber}`);
        console.log('🎉 Dataset verified and ready');
    } catch (error) {
        console.error('❌ Dataset creation failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedCompleteData();
