import prisma from './utils/prisma';

async function checkDatabase() {
    console.log('🔍 Database Health Check');

    try {
        const userCount = await prisma.user.count();
        console.log(`- Total Users: ${userCount}`);

        const wholesalers = await prisma.wholesalerProfile.findMany({
            include: { user: true }
        });
        console.log(`- Total Wholesalers: ${wholesalers.length}`);
        wholesalers.forEach(w => console.log(`  - ${w.companyName} (User: ${w.user.phone}, ID: ${w.id})`));

        const suppliers = await prisma.supplier.count();
        console.log(`- Total Suppliers: ${suppliers}`);

        const invoices = await prisma.profitInvoice.count();
        console.log(`- Total Profit Invoices: ${invoices}`);

        const products = await prisma.product.count();
        console.log(`- Total Products: ${products}`);

        console.log('\n✅ Check completed');
    } catch (error) {
        console.error('❌ Check failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDatabase();
