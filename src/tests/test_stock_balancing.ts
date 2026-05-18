import prisma from '../utils/prisma';
import { confirmOrder, shipOrder, confirmDelivery } from '../controllers/wholesalerController';
import { createOrder } from '../controllers/retailerController';

async function verifyStockBalancing() {
    console.log('🚀 Starting Stock Balancing Verification...');

    try {
        // 1. Setup Data
        const retailerUser = await prisma.user.findFirst({ where: { phone: "250788400001" } });
        const wholesalerUser = await prisma.user.findFirst({ where: { role: "wholesaler" } });

        if (!retailerUser || !wholesalerUser) throw new Error('Test users not found');

        // Top up retailer wallet for test
        await prisma.retailerProfile.update({
            where: { userId: retailerUser.id },
            data: { walletBalance: 500000 }
        });
        console.log('💰 Retailer wallet topped up to 500,000 RWF');

        const wholesalerProfile = await prisma.wholesalerProfile.findFirst({ where: { userId: wholesalerUser.id } });
        const product = await prisma.product.findFirst({ where: { wholesalerId: wholesalerProfile!.id } });

        if (!product) throw new Error('Wholesaler product not found');

        console.log(`📦 Testing with Product: ${product.name}`);
        console.log(`🏭 Initial Wholesaler Stock: ${product.stock}`);

        // 2. Retailer Places Order
        console.log('\n--- Step 1: Retailer places order ---');
        const mockReqRetailer: any = {
            user: { id: retailerUser.id },
            body: {
                items: [{ product_id: product.id, quantity: 1, price: product.price }],
                totalAmount: product.price * 1,
                paymentMethod: 'wallet'
            }
        };

        let orderId: number | null = null;
        const mockResRetailer: any = {
            status: () => ({ json: (d: any) => { console.error('Order Error:', d); } }),
            json: (d: any) => { 
                if (d.success) {
                    orderId = d.order.id; 
                } else {
                    console.error('Order creation failed response:', d);
                }
            }
        };

        await createOrder(mockReqRetailer, mockResRetailer);
        console.log(`✅ Order created successfully: #${orderId}`);

        // 3. Wholesaler Confirms Order (Stock should deduct)
        console.log('\n--- Step 2: Wholesaler confirms order (Stock Deduction) ---');
        const mockReqWholesaler: any = {
            user: { id: wholesalerUser.id },
            params: { id: orderId }
        };

        const mockResWholesaler: any = {
            status: () => ({ json: (d: any) => console.error(d) }),
            json: (d: any) => { console.log('✅ Wholesaler Confirmation Response:', d.message); }
        };

        await confirmOrder(mockReqWholesaler, mockResWholesaler);

        const updatedWholesalerProduct = await prisma.product.findUnique({ where: { id: product.id } });
        console.log(`🏭 Wholesaler Stock After Confirmation: ${updatedWholesalerProduct!.stock} (Diff: ${product.stock - updatedWholesalerProduct!.stock})`);

        if (product.stock - updatedWholesalerProduct!.stock === 1) {
            console.log('✅ Wholesaler stock deduction correct!');
        } else {
            console.error('❌ Wholesaler stock deduction FAILED');
        }

        // 4. Ship Order
        console.log('\n--- Step 3: Wholesaler ships order ---');
        mockReqWholesaler.body = { tracking_number: 'TRK123' };
        await shipOrder(mockReqWholesaler, mockResWholesaler);

        // 5. Confirm Delivery (Retailer stock should increment)
        console.log('\n--- Step 4: Wholesaler confirms delivery (Retailer Stock Increment) ---');
        
        const retailerProfile = await prisma.retailerProfile.findFirst({ where: { userId: retailerUser.id } });
        const initialRetailerProduct = await prisma.product.findFirst({
            where: { retailerId: retailerProfile!.id, name: product.name }
        });
        const initialRetailerStock = initialRetailerProduct?.stock || 0;
        console.log(`🛒 Initial Retailer Stock: ${initialRetailerStock}`);

        await confirmDelivery(mockReqWholesaler, mockResWholesaler);

        const finalRetailerProduct = await prisma.product.findFirst({
            where: { retailerId: retailerProfile!.id, name: product.name }
        });
        const finalRetailerStock = finalRetailerProduct?.stock || 0;
        console.log(`🛒 Final Retailer Stock: ${finalRetailerStock} (Diff: ${finalRetailerStock - initialRetailerStock})`);

        if (finalRetailerStock - initialRetailerStock === 1) {
            console.log('✅ Retailer stock increment correct!');
        } else {
            console.error('❌ Retailer stock increment FAILED');
        }

        console.log('\n🎉 Stock Balancing Verification COMPLETED!');

    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyStockBalancing();
