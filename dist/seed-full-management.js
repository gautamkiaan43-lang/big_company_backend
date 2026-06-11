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
function seedCompleteData() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🌱 Seeding complete sample dataset...');
        try {
            const wholesaler = yield prisma_1.default.wholesalerProfile.findFirst();
            if (!wholesaler) {
                console.log('❌ No wholesaler found');
                return;
            }
            // 1. Get or create a retailer user
            let retailerUser = yield prisma_1.default.user.findFirst({ where: { role: 'retailer' } });
            if (!retailerUser) {
                console.log('👤 Creating sample retailer user...');
                retailerUser = yield prisma_1.default.user.create({
                    data: {
                        phone: '250788200001',
                        password: 'password123',
                        name: 'Demo Retailer',
                        role: 'retailer'
                    }
                });
            }
            // 2. Get or create a retailer profile
            let retailerProfile = yield prisma_1.default.retailerProfile.findUnique({ where: { userId: retailerUser.id } });
            if (!retailerProfile) {
                console.log('🏪 Creating retailer profile...');
                retailerProfile = yield prisma_1.default.retailerProfile.create({
                    data: {
                        userId: retailerUser.id,
                        shopName: 'Demo Retailer Shop'
                    }
                });
            }
            // 3. Create a COMPLETED order
            console.log('📦 Creating completed order...');
            const order = yield prisma_1.default.order.create({
                data: {
                    retailerId: retailerProfile.id,
                    wholesalerId: wholesaler.id,
                    totalAmount: 1200000,
                    status: 'completed'
                }
            });
            // 4. Create Profit Invoice
            console.log('💰 Creating profit invoice...');
            const invoice = yield prisma_1.default.profitInvoice.create({
                data: {
                    orderId: order.id,
                    profitAmount: 180000,
                    invoiceNumber: 'PROF-INV-2024-Verified',
                    generatedAt: new Date()
                }
            });
            console.log(`✅ Success! Created Invoice: ${invoice.invoiceNumber}`);
            console.log('🎉 Dataset verified and ready');
        }
        catch (error) {
            console.error('❌ Dataset creation failed:', error);
        }
        finally {
            yield prisma_1.default.$disconnect();
        }
    });
}
seedCompleteData();
