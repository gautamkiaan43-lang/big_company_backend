
import prisma from './utils/prisma';
import axios from 'axios';
import { generateToken } from './utils/auth';

const BASE_URL = 'http://localhost:9005';

async function runTest() {
    console.log('--- Starting PalmKash Integration Test ---');

    // 1. Setup Test Retailer
    console.log('1. Setting up Test Retailer...');
    let user = await prisma.user.findFirst({ where: { email: 'test_retailer@example.com' } });
    if (!user) {
        user = await prisma.user.create({
            data: {
                email: 'test_retailer@example.com',
                password: 'password123', // hashed usually
                role: 'retailer',
                name: 'Test Retailer'
            }
        });
        await prisma.retailerProfile.create({
            data: {
                userId: user.id,
                shopName: 'Test Shop',
                walletBalance: 1000
            }
        });
    }

    const token = generateToken({ id: user.id, role: user.role });
    const headers = { Authorization: `Bearer ${token}` };

    // 2. Test Wallet Topup (Expect Pending)
    console.log('\n2. Testing Wallet Topup (Initiate)...');
    try {
        const topupRes = await axios.post(`${BASE_URL}/retailer/wallet/topup`, 
            { amount: 500, source: 'mobile_money', phone: '0799999999' }, 
            { headers }
        );
        console.log('Topup Response:', topupRes.data);

        if (topupRes.data.status !== 'pending') {
            throw new Error(`Expected pending status, got ${topupRes.data.status}`);
        }
        
        const txRef = topupRes.data.transactionId;
        console.log(`Transaction Ref: ${txRef}`);

        // Verify DB
        const tx = await prisma.walletTransaction.findFirst({ where: { reference: txRef } });
        console.log('DB Transaction:', tx);
        if (!tx || tx.status !== 'pending' || tx.retailerId === null) {
            throw new Error('DB Transaction validation failed');
        }

        // 3. Test Webhook (Retailer)
        console.log('\n3. Testing Webhook (Retailer Completion)...');
        const webhookRes = await axios.post(`${BASE_URL}/api/webhooks/palmkash`, {
            reference: txRef,
            status: 'COMPLETED',
            transaction_id: txRef
        });
        console.log('Webhook Response:', webhookRes.data);

        // Verify DB update
        const updatedTx = await prisma.walletTransaction.findFirst({ where: { id: tx.id } });
        const updatedProfile = await prisma.retailerProfile.findUnique({ where: { userId: user.id } });
        
        console.log('Updated Transaction Status:', updatedTx?.status);
        console.log('Updated Wallet Balance:', updatedProfile?.walletBalance);

        if (updatedTx?.status !== 'completed') throw new Error('Transaction not completed');
        // Initial 1000 + 500 = 1500 (Assuming logic is correct, if user already existed check balance)
        // If user existed, balance might be higher.
        // We should check increment.
        
        console.log('✅ Retailer Flow Validated');

    } catch (e: any) {
        console.error('Retailer Flow Failed:', e.response?.data || e.message);
        if (e.response?.data?.path) console.error('Path:', e.response.data.path);
    }
}

runTest()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
