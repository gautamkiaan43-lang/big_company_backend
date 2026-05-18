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
const retailerController_1 = require("../controllers/retailerController");
function verifyController() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔍 Verifying Purchase History Controller...');
        try {
            // 1. Get the demo retailer
            const user = yield prisma_1.default.user.findUnique({
                where: { phone: "250788400001" }
            });
            if (!user) {
                console.error('❌ Demo user not found');
                return;
            }
            // Mock Express Request & Response
            const mockReq = {
                user: { id: user.id },
                query: {},
                params: {}
            };
            let responseData = null;
            const mockRes = {
                status: (code) => ({
                    json: (data) => {
                        console.error(`❌ Controller returned error status ${code}:`, data);
                        responseData = data;
                    }
                }),
                json: (data) => {
                    responseData = data;
                }
            };
            // 2. Test getPurchaseOrders
            console.log('\n--- Testing getPurchaseOrders ---');
            yield (0, retailerController_1.getPurchaseOrders)(mockReq, mockRes);
            if (responseData && responseData.orders) {
                console.log(`✅ getPurchaseOrders returned ${responseData.orders.length} orders`);
                console.log('Sample Order:', JSON.stringify(responseData.orders[0], null, 2));
                const orders = responseData.orders;
                const hasWallet = orders.some((o) => o.payment_method === 'wallet');
                const hasCredit = orders.some((o) => o.payment_method === 'credit');
                const hasMomo = orders.some((o) => o.payment_method === 'momo');
                if (hasWallet)
                    console.log('✅ Found Wallet order');
                if (hasCredit)
                    console.log('✅ Found Credit order');
                if (hasMomo)
                    console.log('✅ Found MoMo order');
            }
            else {
                console.error('❌ getPurchaseOrders failed to return orders', responseData);
            }
            // 3. Test getPurchaseOrder (singular)
            if (responseData && responseData.orders && responseData.orders.length > 0) {
                const firstOrderId = responseData.orders[0].id;
                console.log(`\n--- Testing getPurchaseOrder detail for ID: ${firstOrderId} ---`);
                mockReq.params.id = firstOrderId.toString();
                responseData = null;
                yield (0, retailerController_1.getPurchaseOrder)(mockReq, mockRes);
                if (responseData && responseData.order) {
                    console.log('✅ getPurchaseOrder detail returned successfully');
                    console.log('Order Detail:', JSON.stringify(responseData.order, null, 2));
                }
                else {
                    console.error('❌ getPurchaseOrder detail failed', responseData);
                }
            }
            console.log('\n🎉 Controller logic verification COMPLETED!');
        }
        catch (error) {
            console.error('❌ Verification script failed:', error);
        }
        finally {
            yield prisma_1.default.$disconnect();
        }
    });
}
verifyController();
