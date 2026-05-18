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
function testEndpoints() {
    return __awaiter(this, void 0, void 0, function* () {
        const meterNumber = "399703";
        console.log(`=== Testing Alternative Endpoints for Meter: ${meterNumber} ===`);
        const endpoints = [
            { name: 'QueryMeterInfo', url: '/api/QueryMeterInfo' },
            { name: 'Meter Info', url: '/api/Meter/info' },
            { name: 'Order Recharge', url: '/api/Order/recharge' },
            { name: 'VendingMeter', url: '/api/VendingMeter' }
        ];
        for (const ep of endpoints) {
            try {
                console.log(`\n--- Testing ${ep.name} (${ep.url}) ---`);
                const response = yield axios_1.default.post(`${STRONPOWER_BASE}${ep.url}`, {
                    CompanyName,
                    UserName,
                    Password,
                    MeterNo: meterNumber,
                    meter_no: meterNumber, // some use underscore
                    Amount: 500,
                    recharge_amount: 500
                }, {
                    timeout: 10000,
                    validateStatus: () => true
                });
                console.log(`Status: ${response.status}`);
                console.log(`Response:`, JSON.stringify(response.data, null, 2));
            }
            catch (err) {
                console.log(`Error: ${err.message}`);
            }
        }
    });
}
testEndpoints().catch(console.error);
