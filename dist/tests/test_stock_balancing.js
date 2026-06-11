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
const wholesalerController_1 = require("../controllers/wholesalerController");
const retailerController_1 = require("../controllers/retailerController");
function verifyStockBalancing() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚀 Starting Stock Balancing Verification...');
        try {
            // 1. Setup Data
            const retailerUser = yield prisma_1.default.user.findFirst({ where: { phone: "250788400001" } });
            const wholesalerUser = yield prisma_1.default.user.findFirst({ where: { role: "wholesaler" } });
            if (!retailerUser || !wholesalerUser)
                throw new Error('Test users not found');
            // Top up retailer wallet for test
            yield prisma_1.default.retailerProfile.update({
                where: { userId: retailerUser.id },
                data: { walletBalance: 500000 }
            });
            console.log('💰 Retailer wallet topped up to 500,000 RWF');
            const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findFirst({ where: { userId: wholesalerUser.id } });
            const product = yield prisma_1.default.product.findFirst({ where: { wholesalerId: wholesalerProfile.id } });
            if (!product)
                throw new Error('Wholesaler product not found');
            console.log(`📦 Testing with Product: ${product.name}`);
            console.log(`🏭 Initial Wholesaler Stock: ${product.stock}`);
            // 2. Retailer Places Order
            console.log('\n--- Step 1: Retailer places order ---');
            const mockReqRetailer = {
                user: { id: retailerUser.id },
                body: {
                    items: [{ product_id: product.id, quantity: 1, price: product.price }],
                    totalAmount: product.price * 1,
                    paymentMethod: 'wallet'
                }
            };
            let orderId = null;
            const mockResRetailer = {
                status: () => ({ json: (d) => { console.error('Order Error:', d); } }),
                json: (d) => {
                    if (d.success) {
                        orderId = d.order.id;
                    }
                    else {
                        console.error('Order creation failed response:', d);
                    }
                }
            };
            yield (0, retailerController_1.createOrder)(mockReqRetailer, mockResRetailer);
            console.log(`✅ Order created successfully: #${orderId}`);
            // 3. Wholesaler Confirms Order (Stock should deduct)
            console.log('\n--- Step 2: Wholesaler confirms order (Stock Deduction) ---');
            const mockReqWholesaler = {
                user: { id: wholesalerUser.id },
                params: { id: orderId }
            };
            const mockResWholesaler = {
                status: () => ({ json: (d) => console.error(d) }),
                json: (d) => { console.log('✅ Wholesaler Confirmation Response:', d.message); }
            };
            yield (0, wholesalerController_1.confirmOrder)(mockReqWholesaler, mockResWholesaler);
            const updatedWholesalerProduct = yield prisma_1.default.product.findUnique({ where: { id: product.id } });
            console.log(`🏭 Wholesaler Stock After Confirmation: ${updatedWholesalerProduct.stock} (Diff: ${product.stock - updatedWholesalerProduct.stock})`);
            if (product.stock - updatedWholesalerProduct.stock === 1) {
                console.log('✅ Wholesaler stock deduction correct!');
            }
            else {
                console.error('❌ Wholesaler stock deduction FAILED');
            }
            // 4. Ship Order
            console.log('\n--- Step 3: Wholesaler ships order ---');
            mockReqWholesaler.body = { tracking_number: 'TRK123' };
            yield (0, wholesalerController_1.shipOrder)(mockReqWholesaler, mockResWholesaler);
            // 5. Confirm Delivery (Retailer stock should increment)
            console.log('\n--- Step 4: Wholesaler confirms delivery (Retailer Stock Increment) ---');
            const retailerProfile = yield prisma_1.default.retailerProfile.findFirst({ where: { userId: retailerUser.id } });
            const initialRetailerProduct = yield prisma_1.default.product.findFirst({
                where: { retailerId: retailerProfile.id, name: product.name }
            });
            const initialRetailerStock = (initialRetailerProduct === null || initialRetailerProduct === void 0 ? void 0 : initialRetailerProduct.stock) || 0;
            console.log(`🛒 Initial Retailer Stock: ${initialRetailerStock}`);
            yield (0, wholesalerController_1.confirmDelivery)(mockReqWholesaler, mockResWholesaler);
            const finalRetailerProduct = yield prisma_1.default.product.findFirst({
                where: { retailerId: retailerProfile.id, name: product.name }
            });
            const finalRetailerStock = (finalRetailerProduct === null || finalRetailerProduct === void 0 ? void 0 : finalRetailerProduct.stock) || 0;
            console.log(`🛒 Final Retailer Stock: ${finalRetailerStock} (Diff: ${finalRetailerStock - initialRetailerStock})`);
            if (finalRetailerStock - initialRetailerStock === 1) {
                console.log('✅ Retailer stock increment correct!');
            }
            else {
                console.error('❌ Retailer stock increment FAILED');
            }
            console.log('\n🎉 Stock Balancing Verification COMPLETED!');
        }
        catch (error) {
            console.error('❌ Verification failed:', error);
        }
        finally {
            yield prisma_1.default.$disconnect();
        }
    });
}
verifyStockBalancing();
