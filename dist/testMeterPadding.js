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
const axios_1 = __importDefault(require("axios"));
// Load .env from the backend root
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const STRONPOWER_BASE = process.env.STRONPOWER_BASE_URL || 'http://www.server-newv.stronpower.com';
const CompanyName = process.env.STRONPOWER_COMPANY_NAME;
const UserName = process.env.STRONPOWER_USERNAME;
const Password = process.env.STRONPOWER_PASSWORD;
function testPadding() {
    return __awaiter(this, void 0, void 0, function* () {
        const baseMeter = "399703";
        const formats = [
            baseMeter,
            baseMeter.padStart(11, '0'),
            baseMeter.padStart(12, '0'),
            "MTR-" + baseMeter
        ];
        console.log(`=== Testing Meter Formats for: ${baseMeter} ===`);
        for (const meter of formats) {
            try {
                console.log(`\n--- Testing format: "${meter}" ---`);
                const response = yield axios_1.default.post(`${STRONPOWER_BASE}/api/QueryMeterInfo`, {
                    CompanyName,
                    UserName,
                    Password,
                    MeterNo: meter
                }, {
                    timeout: 10000,
                    validateStatus: () => true
                });
                const data = Array.isArray(response.data) ? response.data[0] : response.data;
                console.log(`Meter_id: "${(data === null || data === void 0 ? void 0 : data.Meter_id) || ''}", Meter_type: "${(data === null || data === void 0 ? void 0 : data.Meter_type) || ''}"`);
                if (data === null || data === void 0 ? void 0 : data.Meter_id) {
                    console.log("SUCCESS! Found data:", JSON.stringify(data, null, 2));
                }
            }
            catch (err) {
                console.log(`Error: ${err.message}`);
            }
        }
    });
}
testPadding().catch(console.error);
