import prisma from './utils/prisma';

async function linkData() {
    console.log('🔗 Linking products to suppliers for demo...');

    try {
        const suppliers = await prisma.supplier.findMany();
        const products = await prisma.product.findMany();

        if (suppliers.length === 0 || products.length === 0) {
            console.log('❌ Missing suppliers or products');
            return;
        }

        console.log(`- Found ${suppliers.length} suppliers`);
        console.log(`- Found ${products.length} products`);

        // Link products to suppliers cyclically for coverage
        for (let i = 0; i < products.length; i++) {
            const supplier = suppliers[i % suppliers.length];
            await prisma.product.update({
                where: { id: products[i].id },
                data: { supplierId: supplier.id }
            });
        }

        console.log('✅ Successfully linked products to suppliers');

        // Seed some payments for "Outstanding" calculation
        console.log('💰 Seeding supplier payments...');
        for (const supplier of suppliers) {
            await prisma.supplierPayment.create({
                data: {
                    supplierId: supplier.id,
                    wholesalerId: (supplier as any).wholesalerId,
                    amount: Math.floor(Math.random() * 1000000) + 500000,
                    paymentDate: new Date(),
                    status: 'completed'
                } as any
            });
        }

        console.log('✅ Seeding completed');
    } catch (error) {
        console.error('❌ Linking failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

linkData();
