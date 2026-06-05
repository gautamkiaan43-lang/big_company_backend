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
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
function testRecharge() {
    return __awaiter(this, void 0, void 0, function* () {
        const meterNumber = '58200077509';
        console.log(`Attempting to query meter info for ${meterNumber}...`);
        try {
            const info = yield tokenMeter_service_1.default.queryMeterInfo(meterNumber);
            console.log('Query Result:', info);
        }
        catch (err) {
            console.error('Query error:', err.message);
        }
        console.log(`\nAttempting simulated/real recharge for ${meterNumber}...`);
        try {
            const result = yield tokenMeter_service_1.default.rechargeTokenMeter({
                meterNumber,
                amount: 0.1,
                customerRef: `TEST-${Date.now()}`,
                isVendByUnit: true
            });
            console.log('Recharge Result:', result);
        }
        catch (err) {
            console.error('Recharge Error:', err.message);
        }
    });
}
testRecharge().catch(console.error);
