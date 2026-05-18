import dotenv from 'dotenv';
dotenv.config();

import prisma from './utils/prisma';
import { hashPassword } from './utils/auth';

async function seedConsumerData() {
    console.log('🌱 Seeding consumer data...');

    // Create Consumer 2 (for demo credentials in frontend)
    const consumer2Pin = await hashPassword('1234');
    const consumer2Password = await hashPassword('1234');

    // Delete existing consumer2 if exists
    const existingUser = await prisma.user.findUnique({
        where: { phone: '250788100001' }
    });

    if (existingUser) {
        const existingProfile = await prisma.consumerProfile.findUnique({
            where: { userId: existingUser.id }
        });

        if (existingProfile) {
            // Delete all related data
            await prisma.customerOrder.deleteMany({ where: { consumerId: existingProfile.id } });
            await prisma.gasReward.deleteMany({ where: { consumerId: existingProfile.id } });
            await prisma.gasTopup.deleteMany({ where: { consumerId: existingProfile.id } });
            await prisma.gasMeter.deleteMany({ where: { consumerId: existingProfile.id } });
            await prisma.walletTransaction.deleteMany({
                where: { wallet: { consumerId: existingProfile.id } }
            });
            await prisma.wallet.deleteMany({ where: { consumerId: existingProfile.id } });
        }
    }

    const consumer2 = await prisma.user.upsert({
        where: { phone: '250788100001' },
        update: {},
        create: {
            phone: '250788100001',
            email: 'consumer2@bigcompany.rw',
            pin: consumer2Pin,
            password: consumer2Password,
            name: 'Demo Consumer',
            role: 'consumer',
            consumerProfile: {
                create: {
                    fullName: 'Demo Consumer',
                    address: 'KN 5 Ave, Kigali',
                    landmark: 'Near City Market',
                    isVerified: true,
                    membershipType: 'standard',
                    walletBalance: 10000,
                    rewardsPoints: 50
                }
            }
        }
    });
    console.log('✅ Consumer 2 created');

    // Get consumer profile
    const consumer2Profile = await prisma.consumerProfile.findUnique({
        where: { userId: consumer2.id }
    });

    if (!consumer2Profile) {
        throw new Error('Consumer profile not found');
    }

    // Create Wallets
    const dashboardWallet = await prisma.wallet.create({
        data: {
            consumerId: consumer2Profile.id,
            type: 'dashboard_wallet',
            balance: 50000,
            currency: 'RWF'
        }
    });

    const creditWallet = await prisma.wallet.create({
        data: {
            consumerId: consumer2Profile.id,
            type: 'credit_wallet',
            balance: 15000,
            currency: 'RWF'
        }
    });
    console.log('✅ Wallets created');

    // Create Wallet Transactions
    await prisma.walletTransaction.createMany({
        data: [
            {
                walletId: dashboardWallet.id,
                type: 'topup',
                amount: 50000,
                description: 'Initial wallet topup',
                status: 'completed'
            },
            {
                walletId: dashboardWallet.id,
                type: 'debit',
                amount: 5000,
                description: 'Gas purchase',
                reference: 'ORDER-001',
                status: 'completed'
            },
            {
                walletId: creditWallet.id,
                type: 'credit',
                amount: 15000,
                description: 'Credit limit granted',
                status: 'completed'
            }
        ]
    });
    console.log('✅ Wallet transactions created');

    // Create Gas Meters
    const meter1 = await prisma.gasMeter.create({
        data: {
            consumerId: consumer2Profile.id,
            meterNumber: '250788100001',
            aliasName: 'Home Kitchen',
            ownerName: 'Demo Consumer',
            ownerPhone: '250788100001',
            status: 'active'
        }
    });

    const meter2 = await prisma.gasMeter.create({
        data: {
            consumerId: consumer2Profile.id,
            meterNumber: '250788100002',
            aliasName: 'Guest House',
            ownerName: 'Demo Consumer',
            ownerPhone: '250788100001',
            status: 'active'
        }
    });
    console.log('✅ Gas meters created');

    // Create Gas Topups
    await prisma.gasTopup.createMany({
        data: [
            {
                consumerId: consumer2Profile.id,
                meterId: meter1.id,
                amount: 5000,
                units: 5.5,
                currency: 'RWF',
                status: 'completed'
            },
            {
                consumerId: consumer2Profile.id,
                meterId: meter1.id,
                amount: 10000,
                units: 11.0,
                currency: 'RWF',
                status: 'completed'
            },
            {
                consumerId: consumer2Profile.id,
                meterId: meter2.id,
                amount: 7500,
                units: 8.25,
                currency: 'RWF',
                status: 'completed'
            },
            {
                consumerId: consumer2Profile.id,
                meterId: meter1.id,
                amount: 15000,
                units: 16.5,
                currency: 'RWF',
                status: 'completed'
            },
            {
                consumerId: consumer2Profile.id,
                meterId: meter2.id,
                amount: 12000,
                units: 13.2,
                currency: 'RWF',
                status: 'completed'
            }
        ]
    });
    console.log('✅ Gas topups created');

    // Create Gas Rewards
    await prisma.gasReward.createMany({
        data: [
            {
                consumerId: consumer2Profile.id,
                units: 0.55,
                source: 'purchase',
                reference: 'TOPUP-001'
            },
            {
                consumerId: consumer2Profile.id,
                units: 1.1,
                source: 'purchase',
                reference: 'TOPUP-002'
            },
            {
                consumerId: consumer2Profile.id,
                units: 0.825,
                source: 'purchase',
                reference: 'TOPUP-003'
            },
            {
                consumerId: consumer2Profile.id,
                units: 1.65,
                source: 'purchase',
                reference: 'TOPUP-004'
            },
            {
                consumerId: consumer2Profile.id,
                units: 1.32,
                source: 'purchase',
                reference: 'TOPUP-005'
            },
            {
                consumerId: consumer2Profile.id,
                units: 50.0,
                source: 'bonus',
                reference: 'WELCOME-BONUS'
            }
        ]
    });
    console.log('✅ Gas rewards created');

    // Create Customer Orders
    await prisma.customerOrder.createMany({
        data: [
            {
                consumerId: consumer2Profile.id,
                orderType: 'gas',
                status: 'completed',
                amount: 5000,
                currency: 'RWF',
                items: JSON.stringify([{ meterNumber: '250788100001', units: 5.5, amount: 5000 }]),
                metadata: JSON.stringify({ paymentMethod: 'wallet' })
            },
            {
                consumerId: consumer2Profile.id,
                orderType: 'gas',
                status: 'completed',
                amount: 10000,
                currency: 'RWF',
                items: JSON.stringify([{ meterNumber: '250788100001', units: 11.0, amount: 10000 }]),
                metadata: JSON.stringify({ paymentMethod: 'wallet' })
            },
            {
                consumerId: consumer2Profile.id,
                orderType: 'gas',
                status: 'completed',
                amount: 7500,
                currency: 'RWF',
                items: JSON.stringify([{ meterNumber: '250788100002', units: 8.25, amount: 7500 }]),
                metadata: JSON.stringify({ paymentMethod: 'wallet' })
            },
            {
                consumerId: consumer2Profile.id,
                orderType: 'gas',
                status: 'active',
                amount: 15000,
                currency: 'RWF',
                items: JSON.stringify([{ meterNumber: '250788100001', units: 16.5, amount: 15000 }]),
                metadata: JSON.stringify({ paymentMethod: 'wallet' })
            },
            {
                consumerId: consumer2Profile.id,
                orderType: 'shop',
                status: 'completed',
                amount: 25000,
                currency: 'RWF',
                items: JSON.stringify([
                    { productId: 'p1', name: 'Rice 25kg', quantity: 1, price: 25000 }
                ]),
                metadata: JSON.stringify({ paymentMethod: 'credit' })
            }
        ]
    });
    console.log('✅ Customer orders created');

    console.log('🎉 Consumer data seeding complete!');
}

seedConsumerData()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
