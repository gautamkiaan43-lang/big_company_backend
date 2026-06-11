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
function fixCustomerNames() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔧 Fixing customer names...\n');
        const customers = yield prisma_1.default.consumerProfile.findMany({
            include: { user: true }
        });
        for (const customer of customers) {
            const currentName = customer.user.name;
            const currentFullName = customer.fullName;
            // Check if name is "undefined undefined" or similar issues
            if (!currentName || currentName.includes('undefined') || currentName.trim() === '') {
                const newName = customer.user.phone; // Fallback to phone
                console.log(`Fixing Customer ID ${customer.id}:`);
                console.log(`  Old name: "${currentName}"`);
                console.log(`  New name: "${newName}"`);
                yield prisma_1.default.user.update({
                    where: { id: customer.userId },
                    data: { name: newName }
                });
            }
            // Also fix fullName if it has issues
            if (currentFullName && currentFullName.includes('undefined')) {
                console.log(`  Clearing bad fullName: "${currentFullName}"`);
                yield prisma_1.default.consumerProfile.update({
                    where: { id: customer.id },
                    data: { fullName: null }
                });
            }
        }
        console.log('\n✅ Done! All customer names fixed.');
        yield prisma_1.default.$disconnect();
    });
}
fixCustomerNames().catch(console.error);
