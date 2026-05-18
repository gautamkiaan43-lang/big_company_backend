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
function seedProfitInvoice() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🌱 Seeding sample profit invoice...');
        try {
            const wholesaler = yield prisma_1.default.wholesalerProfile.findFirst();
            if (!wholesaler) {
                console.log('❌ No wholesaler found');
                return;
            }
            // Find or create a completed order for this wholesaler
            let order = yield prisma_1.default.order.findFirst({
                where: { wholesalerId: wholesaler.id, status: 'completed' }
            });
            if (!order) {
                console.log('📦 No completed order found, looking for any order...');
                order = yield prisma_1.default.order.findFirst({
                    where: { wholesalerId: wholesaler.id }
                });
                if (order) {
                    console.log('✏️ Updating order status to completed');
                    order = yield prisma_1.default.order.update({
                        where: { id: order.id },
                        data: { status: 'completed' }
                    });
                }
                else {
                    console.log('❌ No order found to link invoice to');
                    return;
                }
            }
            // Create Profit Invoice
            const invoice = yield prisma_1.default.profitInvoice.create({
                data: {
                    orderId: order.id,
                    profitAmount: 150000,
                    invoiceNumber: 'PROF-INV-2024-Demo',
                    generatedAt: new Date()
                }
            });
            console.log(`✅ Created Profit Invoice: ${invoice.invoiceNumber} for Order: ${order.id}`);
            console.log('🎉 Seeding completed');
        }
        catch (error) {
            console.error('❌ Seeding failed:', error);
        }
        finally {
            yield prisma_1.default.$disconnect();
        }
    });
}
seedProfitInvoice();
