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
const gprsMapping = [
    { imei: '865395070835176', meterNo: '2510170000034', serialNo: '20251017000003', meterKey: '7150AD0C619AE315' },
    { imei: '865395070835077', meterNo: '2510170000042', serialNo: '20251017000004', meterKey: '5998A469DBBFE242' },
    { imei: '865395070834815', meterNo: '2510170000059', serialNo: '20251017000005', meterKey: '6AF128CA123D6220' },
    { imei: '865395070834799', meterNo: '2510170000067', serialNo: '20251017000006', meterKey: '06134ACAE8D11245' },
    { imei: '865395070836075', meterNo: '2510170000075', serialNo: '20251017000007', meterKey: '256AC7760051AFB1' },
    { imei: '865395070835358', meterNo: '2510170000083', serialNo: '20251017000008', meterKey: 'D8839A0D16EB7BB8' },
    { imei: '865395070835564', meterNo: '2510170000091', serialNo: '20251017000009', meterKey: 'A9064A9F1B7A4C7F' },
    { imei: '865395070835598', meterNo: '2510170000109', serialNo: '20251017000010', meterKey: '5C8171560F031058' },
    { imei: '865395070835234', meterNo: '2510170000117', serialNo: '20251017000011', meterKey: '4BE0C4D67F5A7DA5' },
    { imei: '865395070835143', meterNo: '2510170000125', serialNo: '20251017000012', meterKey: '23A108E4E2E044A4' },
    { imei: '865395070835200', meterNo: '2510170000133', serialNo: '20251017000013', meterKey: 'DD2ADA24DD00415D' },
    { imei: '865395070835267', meterNo: '2510170000141', serialNo: '20251017000014', meterKey: 'C840E811D0AE1D9F' },
    { imei: '865395070836364', meterNo: '2510170000158', serialNo: '20251017000015', meterKey: '0E8052B72FF22873' },
    { imei: '865395070829930', meterNo: '2510170000166', serialNo: '20251017000016', meterKey: '75A3BBB3C25CCE86' },
    { imei: '865395070830052', meterNo: '2510170000174', serialNo: '20251017000017', meterKey: '3AFF71255E3C0384' },
    { imei: '865395070836042', meterNo: '2510170000182', serialNo: '20251017000018', meterKey: 'EBF108C110755BCC' },
    { imei: '865395070835473', meterNo: '2510170000190', serialNo: '20251017000019', meterKey: '9EF63F3D45E692B2' },
    { imei: '865395070835796', meterNo: '2510170000208', serialNo: '20251017000020', meterKey: '5773D334FD520FCD' },
    { imei: '865395070835903', meterNo: '2510170000216', serialNo: '20251017000021', meterKey: 'DD405A320414F39E' },
    { imei: '865395070835440', meterNo: '2510170000224', serialNo: '20251017000022', meterKey: '286A43D2323D2DAB' },
    { imei: '865395070835929', meterNo: '2510170000232', serialNo: '20251017000023', meterKey: '2F3AC96E52CC7AC3' },
    { imei: '865395070829914', meterNo: '2510170000240', serialNo: '20251017000024', meterKey: 'EAF887209663F466' },
    { imei: '865395070836091', meterNo: '2510170000257', serialNo: '20251017000025', meterKey: 'DE6D3DE1CD5D3CE6' },
    { imei: '865395070835937', meterNo: '2510170000265', serialNo: '20251017000026', meterKey: '31B70A400A31D7CE' },
    { imei: '865395070835721', meterNo: '2510170000273', serialNo: '20251017000027', meterKey: 'A0AC43942D0760D0' },
    { imei: '865395070834807', meterNo: '2510170000281', serialNo: '20251017000028', meterKey: '063AA4554C951029' },
    { imei: '865395070835119', meterNo: '2510170000299', serialNo: '20251017000029', meterKey: 'D89CD9AA5973D2F7' },
    { imei: '865395070835507', meterNo: '2510170000307', serialNo: '20251017000030', meterKey: '9706C94732FE04CF' },
    { imei: '865395070835085', meterNo: '2510170000315', serialNo: '20251017000031', meterKey: '2CEFA2D73D11FF56' },
    { imei: '865395070835655', meterNo: '2510170000323', serialNo: '20251017000032', meterKey: '6D46EF9BD79BF7B8' },
    { imei: '865395070835804', meterNo: '2510170000331', serialNo: '20251017000033', meterKey: 'ACF9B3297F964BCC' },
    { imei: '865395070835812', meterNo: '2510170000349', serialNo: '20251017000034', meterKey: '04C1D39D0281563C' },
    { imei: '865395070835622', meterNo: '2510170000356', serialNo: '20251017000035', meterKey: '1AD40E3FFEE73F46' },
    { imei: '865395070835838', meterNo: '2510170000366', serialNo: '20251017000036', meterKey: '1623FE592F03EA5E' },
    { imei: '865395070836240', meterNo: '2510170000372', serialNo: '20251017000037', meterKey: '767CE2C37E8D214A' },
    { imei: '865395070834716', meterNo: '2510170000380', serialNo: '20251017000038', meterKey: 'F7CE4E0166FA5A2D' },
    { imei: '865395070830177', meterNo: '2510170000398', serialNo: '20251017000039', meterKey: '41C098D92682DCB0' },
    { imei: '865395070835820', meterNo: '2510170000406', serialNo: '20251017000040', meterKey: 'C4B9230DBB721C07' },
    { imei: '865395070836224', meterNo: '2510170000414', serialNo: '20251017000041', meterKey: 'DD29886D1CF79313' },
    { imei: '865395070834708', meterNo: '2510170000422', serialNo: '20251017000042', meterKey: '2198F6E23B901A47' },
    { imei: '865395070829963', meterNo: '2510170000430', serialNo: '20251017000043', meterKey: '8A956380AF81630E' },
    { imei: '865395070835861', meterNo: '2510170000448', serialNo: '20251017000044', meterKey: '2B6894936D433A27' },
    { imei: '865395070835283', meterNo: '2510170000455', serialNo: '20251017000045', meterKey: '3CE2D498C5B7E641' },
    { imei: '865395070835879', meterNo: '2510170000463', serialNo: '20251017000046', meterKey: '101F24B233C79884' },
    { imei: '865395070835531', meterNo: '2510170000471', serialNo: '20251017000047', meterKey: 'CF7B5CEAF8017A61' },
    { imei: '865395070835846', meterNo: '2510170000489', serialNo: '20251017000048', meterKey: 'E643F6A5E467B133' },
    { imei: '865395070830128', meterNo: '2510170000497', serialNo: '20251017000049', meterKey: '9B1056D3A6573616' },
    { imei: '865395070830201', meterNo: '2510170000505', serialNo: '20251017000050', meterKey: '703EFB6E7CCC776F' },
];
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚀 Starting GPRS Meter Mapping Import...');
        // Use consumer ID 1 as the default owner for these GPRS meters
        const defaultConsumerId = 1;
        for (const item of gprsMapping) {
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
