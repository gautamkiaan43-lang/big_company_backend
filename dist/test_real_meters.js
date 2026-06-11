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
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const tokenMeter_service_1 = __importDefault(require("./services/tokenMeter.service"));
const zhongyiMeter_service_1 = __importDefault(require("./services/zhongyiMeter.service"));
// Load .env
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
function runTest() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('--- STARTING METER CHECKS ---');
        // 1. Check Zamuka (LoRa/Stronpower)
        const zamukaId = '58200077509';
        console.log(`\n1. Querying Zamuka Meter: ${zamukaId} via Stronpower service...`);
        try {
            const zamukaResult = yield tokenMeter_service_1.default.queryMeterInfo(zamukaId);
            console.log('Zamuka Query Response:', JSON.stringify(zamukaResult, null, 2));
        }
        catch (err) {
            console.error('Zamuka Query Error:', err.message);
        }
        // 2. Check Tekana (GPRS/Zhongyi)
        const tekanaId = '2510170000497';
        console.log(`\n2. Querying Tekana Meter: ${tekanaId} via Zhongyi service...`);
        try {
            const tekanaResult = yield zhongyiMeter_service_1.default.queryMeter(tekanaId);
            console.log('Tekana Query Response:', JSON.stringify(tekanaResult, null, 2));
        }
        catch (err) {
            console.error('Tekana Query Error:', err.message);
        }
        console.log('\n--- METER CHECKS COMPLETE ---');
    });
}
runTest().catch(console.error);
