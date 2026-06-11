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
function test() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Testing SystemEmailLog creation...');
            const log = yield prisma.systemEmailLog.create({
                data: {
                    recipientPhone: '250788000000',
                    templateType: 'TEST',
                    channel: 'SMS',
                    status: 'PENDING'
                }
            });
            console.log('✅ Success! Created log ID:', log.id);
            console.log('Testing SystemEmailLog update...');
            yield prisma.systemEmailLog.update({
                where: { id: log.id },
                data: {
                    externalMessageId: '123456'
                }
            });
            console.log('✅ Success! Updated log.');
            // Cleanup
            yield prisma.systemEmailLog.delete({ where: { id: log.id } });
        }
        catch (error) {
            console.error('❌ Failed:', error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
test();
