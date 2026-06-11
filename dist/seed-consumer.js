"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma_1 = __importDefault(require("./utils/prisma"));
const auth_1 = require("./utils/auth");
function seedConsumerData() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🌱 Seeding consumer data...');
        // Create Consumer 2 (for demo credentials in frontend)
        const consumer2Pin = yield (0, auth_1.hashPassword)('1234');
        const consumer2Password = yield (0, auth_1.hashPassword)('1234');
        // Delete existing consumer2 if exists
        const existingUser = yield prisma_1.default.user.findUnique({
            where: { phone: '250788100001' }
        });
        if (existingUser) {
            const existingProfile = yield prisma_1.default.consumerProfile.findUnique({
                where: { userId: existingUser.id }
            });
            if (existingProfile) {
                // Delete all related data
                yield prisma_1.default.customerOrder.deleteMany({ where: { consumerId: existingProfile.id } });
                yield prisma_1.default.gasReward.deleteMany({ where: { consumerId: existingProfile.id } });
                yield prisma_1.default.gasTopup.deleteMany({ where: { consumerId: existingProfile.id } });
                yield prisma_1.default.gasMeter.deleteMany({ where: { consumerId: existingProfile.id } });
                yield prisma_1.default.walletTransaction.deleteMany({
                    where: { wallet: { consumerId: existingProfile.id } }
                });
                yield prisma_1.default.wallet.deleteMany({ where: { consumerId: existingProfile.id } });
            }
        }
        const consumer2 = yield prisma_1.default.user.upsert({
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
        const consumer2Profile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId: consumer2.id }
        });
        if (!consumer2Profile) {
            throw new Error('Consumer profile not found');
        }
        // Create Wallets
        const dashboardWallet = yield prisma_1.default.wallet.create({
            data: {
                consumerId: consumer2Profile.id,
                type: 'dashboard_wallet',
                balance: 50000,
                currency: 'RWF'
            }
        });
        const creditWallet = yield prisma_1.default.wallet.create({
            data: {
                consumerId: consumer2Profile.id,
                type: 'credit_wallet',
                balance: 15000,
                currency: 'RWF'
            }
        });
        console.log('✅ Wallets created');
        // Create Wallet Transactions
        yield prisma_1.default.walletTransaction.createMany({
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
        const meter1 = yield prisma_1.default.gasMeter.create({
            data: {
                consumerId: consumer2Profile.id,
                meterNumber: '250788100001',
                aliasName: 'Home Kitchen',
                ownerName: 'Demo Consumer',
                ownerPhone: '250788100001',
                status: 'active'
            }
        });
        const meter2 = yield prisma_1.default.gasMeter.create({
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
        yield prisma_1.default.gasTopup.createMany({
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
        yield prisma_1.default.gasReward.createMany({
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
        yield prisma_1.default.customerOrder.createMany({
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
    });
}
seedConsumerData()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.default.$disconnect();
}));
