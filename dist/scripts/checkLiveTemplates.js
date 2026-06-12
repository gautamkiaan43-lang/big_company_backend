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
const LIVE_DB_URL = 'mysql://root:gQxwAOSxaWhwCMjsgnSQBEYBlZxnReva@centerbeam.proxy.rlwy.net:23787/railway';
const livePrisma = new client_1.PrismaClient({
    datasources: { db: { url: LIVE_DB_URL } }
});
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const t = yield livePrisma.emailTemplate.findUnique({
            where: { name: 'CUS-SMS-011' }
        });
        console.log('CUS-SMS-011 template:', t ? JSON.stringify(t, null, 2) : 'NOT FOUND');
        const e = yield livePrisma.emailEvent.findUnique({
            where: { eventSlug: 'customer-failed-login' }
        });
        console.log('customer-failed-login event:', e ? JSON.stringify(e, null, 2) : 'NOT FOUND');
        const total = yield livePrisma.emailTemplate.count();
        console.log('Total templates in live DB:', total);
    });
}
main()
    .catch(console.error)
    .finally(() => livePrisma.$disconnect());
