import dotenv from 'dotenv';
import path from 'path';
import prisma from './utils/prisma';
import { sendToMeter } from './controllers/rewardsController';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testRewards() {
    console.log('--- TESTING REWARDS SEND TO METER ---');

    // Setup dummy consumer profile and add rewards points to it
    const testUser = await prisma.user.findFirst();
    if (!testUser) {
        console.error('No user found in DB to test with.');
        return;
    }

    let consumer = await prisma.consumerProfile.findUnique({
        where: { userId: testUser.id }
    });

    if (!consumer) {
        consumer = await prisma.consumerProfile.create({
            data: {
                userId: testUser.id,
                walletBalance: 10000,
                rewardsPoints: 50000, // plenty of points
                membershipType: 'standard'
            }
        });
    } else {
        await prisma.consumerProfile.update({
            where: { id: consumer.id },
            data: { rewardsPoints: 50000 }
        });
    }

    // Add some GasReward units so getGasRewardsBalance doesn't complain about insufficient balance
    await prisma.gasReward.create({
        data: {
            consumerId: consumer.id,
            units: 10.0,
            source: 'bonus',
            reference: 'Setup Test'
        }
    });

    const mockReq = (meterId: string, meterType: string) => ({
        user: { id: testUser.id, role: 'consumer' },
        body: {
            meterId,
            amount: 0.2, // m3
            meterType
        }
    } as any);

    const mockRes = {
        status: (code: number) => {
            console.log(`Response Status: ${code}`);
            return mockRes;
        },
        json: (data: any) => {
            console.log('Response JSON:', JSON.stringify(data, null, 2));
            return mockRes;
        }
    } as any;

    // 1. Zamuka Meter
    console.log('\nTesting Send Gas Rewards to Zamuka (58200077509):');
    await sendToMeter(mockReq('58200077509', 'LORA_NB'), mockRes);

    // 2. Tekana Meter
    console.log('\nTesting Send Gas Rewards to Tekana (2510170000497):');
    await sendToMeter(mockReq('2510170000497', 'GPRS'), mockRes);

    console.log('\n--- TESTING REWARDS SEND TO METER COMPLETE ---');
}

testRewards().catch(console.error).finally(() => prisma.$disconnect());
