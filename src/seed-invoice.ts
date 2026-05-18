import prisma from './utils/prisma';

async function seedProfitInvoice() {
    console.log('🌱 Seeding sample profit invoice...');

    try {
        const wholesaler = await prisma.wholesalerProfile.findFirst();
        if (!wholesaler) {
            console.log('❌ No wholesaler found');
            return;
        }

        // Find or create a completed order for this wholesaler
        let order = await prisma.order.findFirst({
            where: { wholesalerId: wholesaler.id, status: 'completed' }
        });

        if (!order) {
            console.log('📦 No completed order found, looking for any order...');
            order = await prisma.order.findFirst({
                where: { wholesalerId: wholesaler.id }
            });

            if (order) {
                console.log('✏️ Updating order status to completed');
                order = await prisma.order.update({
                    where: { id: order.id },
                    data: { status: 'completed' }
                });
            } else {
                console.log('❌ No order found to link invoice to');
                return;
            }
        }

        // Create Profit Invoice
        const invoice = await prisma.profitInvoice.create({
            data: {
                orderId: order.id,
                profitAmount: 150000,
                invoiceNumber: 'PROF-INV-2024-Demo',
                generatedAt: new Date()
            }
        });

        console.log(`✅ Created Profit Invoice: ${invoice.invoiceNumber} for Order: ${order.id}`);
        console.log('🎉 Seeding completed');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedProfitInvoice();
