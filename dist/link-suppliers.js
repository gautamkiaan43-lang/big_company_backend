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
function linkData() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔗 Linking products to suppliers for demo...');
        try {
            const suppliers = yield prisma_1.default.supplier.findMany();
            const products = yield prisma_1.default.product.findMany();
            if (suppliers.length === 0 || products.length === 0) {
                console.log('❌ Missing suppliers or products');
                return;
            }
            console.log(`- Found ${suppliers.length} suppliers`);
            console.log(`- Found ${products.length} products`);
            // Link products to suppliers cyclically for coverage
            for (let i = 0; i < products.length; i++) {
                const supplier = suppliers[i % suppliers.length];
                yield prisma_1.default.product.update({
                    where: { id: products[i].id },
                    data: { supplierId: supplier.id }
                });
            }
            console.log('✅ Successfully linked products to suppliers');
            // Seed some payments for "Outstanding" calculation
            console.log('💰 Seeding supplier payments...');
            for (const supplier of suppliers) {
                yield prisma_1.default.supplierPayment.create({
                    data: {
                        supplierId: supplier.id,
                        wholesalerId: supplier.wholesalerId,
                        amount: Math.floor(Math.random() * 1000000) + 500000,
                        paymentDate: new Date(),
                        status: 'completed'
                    }
                });
            }
            console.log('✅ Seeding completed');
        }
        catch (error) {
            console.error('❌ Linking failed:', error);
        }
        finally {
            yield prisma_1.default.$disconnect();
        }
    });
}
linkData();
