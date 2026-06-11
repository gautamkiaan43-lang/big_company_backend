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
const prisma_1 = __importDefault(require("./utils/prisma"));
const axios_1 = __importDefault(require("axios"));
const auth_1 = require("./utils/auth");
const BASE_URL = 'http://localhost:9005';
function runTest() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        console.log('--- Starting PalmKash Integration Test ---');
        // 1. Setup Test Retailer
        console.log('1. Setting up Test Retailer...');
        let user = yield prisma_1.default.user.findFirst({ where: { email: 'test_retailer@example.com' } });
        if (!user) {
            user = yield prisma_1.default.user.create({
                data: {
                    email: 'test_retailer@example.com',
                    password: 'password123', // hashed usually
                    role: 'retailer',
                    name: 'Test Retailer'
                }
            });
            yield prisma_1.default.retailerProfile.create({
                data: {
                    userId: user.id,
                    shopName: 'Test Shop',
                    walletBalance: 1000
                }
            });
        }
        const token = (0, auth_1.generateToken)({ id: user.id, role: user.role });
        const headers = { Authorization: `Bearer ${token}` };
        // 2. Test Wallet Topup (Expect Pending)
        console.log('\n2. Testing Wallet Topup (Initiate)...');
        try {
            const topupRes = yield axios_1.default.post(`${BASE_URL}/retailer/wallet/topup`, { amount: 500, source: 'mobile_money', phone: '0799999999' }, { headers });
            console.log('Topup Response:', topupRes.data);
            if (topupRes.data.status !== 'pending') {
                throw new Error(`Expected pending status, got ${topupRes.data.status}`);
            }
            const txRef = topupRes.data.transactionId;
            console.log(`Transaction Ref: ${txRef}`);
            // Verify DB
            const tx = yield prisma_1.default.walletTransaction.findFirst({ where: { reference: txRef } });
            console.log('DB Transaction:', tx);
            if (!tx || tx.status !== 'pending' || tx.retailerId === null) {
                throw new Error('DB Transaction validation failed');
            }
            // 3. Test Webhook (Retailer)
            console.log('\n3. Testing Webhook (Retailer Completion)...');
            const webhookRes = yield axios_1.default.post(`${BASE_URL}/api/webhooks/palmkash`, {
                reference: txRef,
                status: 'COMPLETED',
                transaction_id: txRef
            });
            console.log('Webhook Response:', webhookRes.data);
            // Verify DB update
            const updatedTx = yield prisma_1.default.walletTransaction.findFirst({ where: { id: tx.id } });
            const updatedProfile = yield prisma_1.default.retailerProfile.findUnique({ where: { userId: user.id } });
            console.log('Updated Transaction Status:', updatedTx === null || updatedTx === void 0 ? void 0 : updatedTx.status);
            console.log('Updated Wallet Balance:', updatedProfile === null || updatedProfile === void 0 ? void 0 : updatedProfile.walletBalance);
            if ((updatedTx === null || updatedTx === void 0 ? void 0 : updatedTx.status) !== 'completed')
                throw new Error('Transaction not completed');
            // Initial 1000 + 500 = 1500 (Assuming logic is correct, if user already existed check balance)
            // If user existed, balance might be higher.
            // We should check increment.
            console.log('✅ Retailer Flow Validated');
        }
        catch (e) {
            console.error('Retailer Flow Failed:', ((_a = e.response) === null || _a === void 0 ? void 0 : _a.data) || e.message);
            if ((_c = (_b = e.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.path)
                console.error('Path:', e.response.data.path);
        }
    });
}
runTest()
    .catch(console.error)
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.default.$disconnect();
}));
