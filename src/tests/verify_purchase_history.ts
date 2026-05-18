import prisma from '../utils/prisma';
import { getPurchaseOrders, getPurchaseOrder } from '../controllers/retailerController';
import { Response } from 'express';

async function verifyController() {
  console.log('🔍 Verifying Purchase History Controller...');

  try {
    // 1. Get the demo retailer
    const user = await prisma.user.findUnique({
      where: { phone: "250788400001" }
    });

    if (!user) {
      console.error('❌ Demo user not found');
      return;
    }

    // Mock Express Request & Response
    const mockReq: any = {
      user: { id: user.id },
      query: {},
      params: {}
    };

    let responseData: any = null;
    const mockRes: any = {
      status: (code: number) => ({
        json: (data: any) => {
          console.error(`❌ Controller returned error status ${code}:`, data);
          responseData = data;
        }
      }),
      json: (data: any) => {
        responseData = data;
      }
    };

    // 2. Test getPurchaseOrders
    console.log('\n--- Testing getPurchaseOrders ---');
    await getPurchaseOrders(mockReq, mockRes);
    
    if (responseData && responseData.orders) {
      console.log(`✅ getPurchaseOrders returned ${responseData.orders.length} orders`);
      console.log('Sample Order:', JSON.stringify(responseData.orders[0], null, 2));
      
      const orders = responseData.orders;
      const hasWallet = orders.some((o: any) => o.payment_method === 'wallet');
      const hasCredit = orders.some((o: any) => o.payment_method === 'credit');
      const hasMomo = orders.some((o: any) => o.payment_method === 'momo');
      
      if (hasWallet) console.log('✅ Found Wallet order');
      if (hasCredit) console.log('✅ Found Credit order');
      if (hasMomo) console.log('✅ Found MoMo order');
      
    } else {
      console.error('❌ getPurchaseOrders failed to return orders', responseData);
    }

    // 3. Test getPurchaseOrder (singular)
    if (responseData && responseData.orders && responseData.orders.length > 0) {
      const firstOrderId = responseData.orders[0].id;
      console.log(`\n--- Testing getPurchaseOrder detail for ID: ${firstOrderId} ---`);
      
      mockReq.params.id = firstOrderId.toString();
      responseData = null;
      
      await getPurchaseOrder(mockReq, mockRes);
      
      if (responseData && responseData.order) {
        console.log('✅ getPurchaseOrder detail returned successfully');
        console.log('Order Detail:', JSON.stringify(responseData.order, null, 2));
      } else {
        console.error('❌ getPurchaseOrder detail failed', responseData);
      }
    }

    console.log('\n🎉 Controller logic verification COMPLETED!');

  } catch (error) {
    console.error('❌ Verification script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyController();
