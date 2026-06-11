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
console.log('🏁 Script started');
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const palmKash_service_1 = __importDefault(require("./services/palmKash.service"));
console.log('🔑 Loading environment variables...');
// Load environment variables from .env
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
console.log('✅ Environment loaded');
function runTest() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🧪 Starting PalmKash Connection Test...');
        console.log(`📍 Using PALMKASH_API_URL: ${process.env.PALMKASH_API_URL}`);
        console.log(`📍 Using DEV_MODE: ${process.env.DEV_MODE}`);
        try {
            const testAmount = 100;
            const testPhone = '0780000000'; // Example Rwanda phone
            const referenceId = `TEST-${Date.now()}`;
            console.log(`\n🚀 Initiating payment for ${testPhone}, Amount: ${testAmount}`);
            const result = yield palmKash_service_1.default.initiatePayment({
                amount: testAmount,
                phoneNumber: testPhone,
                referenceId: referenceId,
                description: 'Test payment from debug script'
            });
            console.log('\n📊 Test Result:');
            if (result.success) {
                console.log('✅ SUCCESS!');
                console.log(`Transaction ID: ${result.transactionId}`);
                console.log(`Status: ${result.status}`);
                console.log(`Message: ${result.message}`);
            }
            else {
                console.log('❌ FAILED');
                console.log(`Error: ${result.error}`);
            }
        }
        catch (error) {
            console.error('\n💥 Unexpected Error during test execution:');
            if (error.response) {
                console.error(`Status: ${error.response.status}`);
                console.error('Data:', JSON.stringify(error.response.data, null, 2));
                if (typeof error.response.data === 'string' && error.response.data.includes('Cloudflare')) {
                    console.error('🛑 [Cloudflare Block Detected]');
                }
            }
            else {
                console.error(error.message);
            }
        }
    });
}
runTest();
