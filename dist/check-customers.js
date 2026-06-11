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
function checkCustomers() {
    return __awaiter(this, void 0, void 0, function* () {
        const customers = yield prisma_1.default.consumerProfile.findMany({
            include: { user: true },
            orderBy: { id: 'desc' },
            take: 5
        });
        console.log('\n📊 Recent Customers in Database:\n');
        customers.forEach((c, i) => {
            console.log(`${i + 1}. Customer ID: ${c.id}`);
            console.log(`   fullName: "${c.fullName}"`);
            console.log(`   user.name: "${c.user.name}"`);
            console.log(`   phone: ${c.user.phone}`);
            console.log(`   email: ${c.user.email || 'N/A'}`);
            console.log('');
        });
        yield prisma_1.default.$disconnect();
    });
}
checkCustomers().catch(console.error);
