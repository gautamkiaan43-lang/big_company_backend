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
function fixLastCustomer() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔧 Fixing last customer (ID: 7)...\n');
        const customer = yield prisma_1.default.consumerProfile.findUnique({
            where: { id: 7 },
            include: { user: true }
        });
        if (!customer) {
            console.log('Customer not found!');
            return;
        }
        console.log('Current data:');
        console.log(`  name: "${customer.user.name}"`);
        console.log(`  fullName: "${customer.fullName}"`);
        console.log(`  email: "${customer.user.email}"`);
        // Extract name from email
        const emailName = customer.user.email.split('@')[0];
        const newName = emailName
            .split(/[._-]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
        console.log(`\nNew name: "${newName}"`);
        yield prisma_1.default.user.update({
            where: { id: customer.userId },
            data: { name: newName }
        });
        yield prisma_1.default.consumerProfile.update({
            where: { id: 7 },
            data: { fullName: null }
        });
        console.log('\n✅ Fixed!');
        yield prisma_1.default.$disconnect();
    });
}
fixLastCustomer().catch(console.error);
