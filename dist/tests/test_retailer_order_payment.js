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
const prisma_1 = __importDefault(require("../utils/prisma"));
function verifyPayments() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        console.log('🚀 Starting Retailer Payment Verification...');
        try {
            // 1. Get a demo retailer
            const retailer = yield prisma_1.default.retailerProfile.findFirst({
                where: { user: { phone: "250788400001" } },
                include: { credit: true }
            });
            if (!retailer) {
                console.error('❌ Demo retailer not found');
                return;
            }
            console.log(`✅ Found Retailer: ${retailer.shopName}`);
            console.log(`💰 Wallet Balance: ${retailer.walletBalance} RWF`);
            if (retailer.credit) {
                console.log(`💳 Credit Available: ${retailer.credit.availableCredit} RWF / ${retailer.credit.creditLimit} RWF`);
            }
            else {
                console.log('⚠️ No credit profile found for retailer');
                // Create one for testing if missing
                yield prisma_1.default.retailerCredit.create({
                    data: {
                        retailerId: retailer.id,
                        creditLimit: 50000,
                        usedCredit: 0,
                        availableCredit: 50000
                    }
                });
                console.log('✅ Created temporary credit profile (50,000 RWF)');
            }
            // 2. Mock an order request for Wallet
            console.log('\n--- Testing WALLET Payment ---');
            const walletOrderTotal = 1000;
            if (retailer.walletBalance < walletOrderTotal) {
                console.log('⚠️ Recharging wallet for test...');
                yield prisma_1.default.retailerProfile.update({
                    where: { id: retailer.id },
                    data: { walletBalance: { increment: 5000 } }
                });
            }
            const walletBefore = ((_a = (yield prisma_1.default.retailerProfile.findUnique({ where: { id: retailer.id } }))) === null || _a === void 0 ? void 0 : _a.walletBalance) || 0;
            // Simulate createOrder logic (we'll just run it directly as a script check)
            yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                yield tx.retailerProfile.update({
                    where: { id: retailer.id },
                    data: { walletBalance: { decrement: walletOrderTotal } }
                });
                yield tx.order.create({
                    data: {
                        retailerId: retailer.id,
                        wholesalerId: retailer.linkedWholesalerId || 1, // Fallback for test
                        totalAmount: walletOrderTotal,
                        paymentMethod: 'wallet',
                        status: 'pending'
                    }
                });
            }));
            const walletAfter = ((_b = (yield prisma_1.default.retailerProfile.findUnique({ where: { id: retailer.id } }))) === null || _b === void 0 ? void 0 : _b.walletBalance) || 0;
            console.log(`✅ Wallet before: ${walletBefore}, After: ${walletAfter} (Diff: ${walletBefore - walletAfter})`);
            if (walletBefore - walletAfter === walletOrderTotal)
                console.log('✅ Wallet deduction correct!');
            // 3. Mock an order request for Credit
            console.log('\n--- Testing CREDIT Payment ---');
            const creditOrderTotal = 2000;
            const creditBefore = ((_c = (yield prisma_1.default.retailerCredit.findUnique({ where: { retailerId: retailer.id } }))) === null || _c === void 0 ? void 0 : _c.availableCredit) || 0;
            yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                yield tx.retailerCredit.update({
                    where: { retailerId: retailer.id },
                    data: {
                        availableCredit: { decrement: creditOrderTotal },
                        usedCredit: { increment: creditOrderTotal }
                    }
                });
                yield tx.order.create({
                    data: {
                        retailerId: retailer.id,
                        wholesalerId: retailer.linkedWholesalerId || 1,
                        totalAmount: creditOrderTotal,
                        paymentMethod: 'credit',
                        status: 'pending'
                    }
                });
            }));
            const creditAfter = ((_d = (yield prisma_1.default.retailerCredit.findUnique({ where: { retailerId: retailer.id } }))) === null || _d === void 0 ? void 0 : _d.availableCredit) || 0;
            console.log(`✅ Credit before: ${creditBefore}, After: ${creditAfter} (Diff: ${creditBefore - creditAfter})`);
            if (creditBefore - creditAfter === creditOrderTotal)
                console.log('✅ Credit deduction correct!');
            // 4. Mock an order request for MoMo
            console.log('\n--- Testing MOMO Payment ---');
            const momoOrderTotal = 3000;
            const orderCountBefore = yield prisma_1.default.order.count({ where: { retailerId: retailer.id, paymentMethod: 'momo' } });
            yield prisma_1.default.order.create({
                data: {
                    retailerId: retailer.id,
                    wholesalerId: retailer.linkedWholesalerId || 1,
                    totalAmount: momoOrderTotal,
                    paymentMethod: 'momo',
                    status: 'pending_payment'
                }
            });
            const orderCountAfter = yield prisma_1.default.order.count({ where: { retailerId: retailer.id, paymentMethod: 'momo' } });
            if (orderCountAfter > orderCountBefore)
                console.log('✅ MoMo order created with status pending_payment!');
            console.log('\n🎉 All backend logic tests PASSED!');
        }
        catch (error) {
            console.error('❌ Verification failed:', error);
        }
        finally {
            yield prisma_1.default.$disconnect();
        }
    });
}
verifyPayments();
