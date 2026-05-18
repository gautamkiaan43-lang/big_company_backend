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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const retailers = yield prisma.retailerProfile.findMany({
            include: {
                user: {
                    select: { email: true, phone: true }
                }
            }
        });
        console.log('Available Retailers:');
        retailers.forEach(r => {
            console.log(`- ID: ${r.id}, Name: ${r.shopName}, Province: ${r.province}, District: ${r.district}, Sector: ${r.sector}`);
        });
        const consumers = yield prisma.consumerProfile.findMany({
            include: {
                user: {
                    select: { phone: true }
                },
                customerLinkRequests: {
                    where: { status: 'approved' },
                    include: { retailer: true }
                }
            }
        });
        console.log('\nAvailable Consumers:');
        consumers.forEach(c => {
            var _a;
            console.log(`- ID: ${c.id}, Phone: ${(_a = c.user) === null || _a === void 0 ? void 0 : _a.phone}`);
            console.log(`  Approved Links: ${c.customerLinkRequests.map(r => r.retailer.shopName).join(', ') || 'None'}`);
        });
    });
}
main()
    .catch(e => console.error(e))
    .finally(() => __awaiter(void 0, void 0, void 0, function* () { return yield prisma.$disconnect(); }));
