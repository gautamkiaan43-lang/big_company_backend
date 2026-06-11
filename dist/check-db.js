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
function checkDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔍 Database Health Check');
        try {
            const userCount = yield prisma_1.default.user.count();
            console.log(`- Total Users: ${userCount}`);
            const wholesalers = yield prisma_1.default.wholesalerProfile.findMany({
                include: { user: true }
            });
            console.log(`- Total Wholesalers: ${wholesalers.length}`);
            wholesalers.forEach(w => console.log(`  - ${w.companyName} (User: ${w.user.phone}, ID: ${w.id})`));
            const suppliers = yield prisma_1.default.supplier.count();
            console.log(`- Total Suppliers: ${suppliers}`);
            const invoices = yield prisma_1.default.profitInvoice.count();
            console.log(`- Total Profit Invoices: ${invoices}`);
            const products = yield prisma_1.default.product.count();
            console.log(`- Total Products: ${products}`);
            console.log('\n✅ Check completed');
        }
        catch (error) {
            console.error('❌ Check failed:', error);
        }
        finally {
            yield prisma_1.default.$disconnect();
        }
    });
}
checkDatabase();
