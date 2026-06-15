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
const gprsMapping_1 = require("./config/gprsMapping");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚀 Starting GPRS Meter Mapping Import...');
        // Use consumer ID 1 as the default owner for these GPRS meters
        const defaultConsumerId = 1;
        for (const item of gprsMapping_1.gprsMapping) {
            try {
                const result = yield prisma.gasMeter.upsert({
                    where: { meterNumber: item.meterNo },
                    update: {
                        imei: item.imei,
                        serialNo: item.serialNo,
                        meterKey: item.meterKey,
                        isGprs: true,
                        meterType: 'TOKEN', // These are STS tokens pushed via GPRS
                    },
                    create: {
                        meterNumber: item.meterNo,
                        imei: item.imei,
                        serialNo: item.serialNo,
                        meterKey: item.meterKey,
                        isGprs: true,
                        meterType: 'TOKEN',
                        consumerId: defaultConsumerId,
                        status: 'active'
                    },
                });
                console.log(`✅ Linked Meter: ${item.meterNo} -> IMEI: ${item.imei}`);
            }
            catch (error) {
                console.error(`❌ Failed to link Meter: ${item.meterNo}. Error: ${error.message}`);
            }
        }
        console.log('✨ Import completed.');
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
