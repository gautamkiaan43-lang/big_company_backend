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
const palmKash_service_1 = __importDefault(require("./services/palmKash.service"));
dotenv_1.default.config();
function testPalmKash() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Testing PalmKash integration after IP whitelisting...');
        const testData = {
            amount: 10,
            phoneNumber: '0780000000', // Dummy number for testing
            referenceId: `TEST-${Date.now()}`,
            description: 'Test payment after IP whitelisting'
        };
        try {
            const result = yield palmKash_service_1.default.initiatePayment(testData);
            console.log('PalmKash Service Result:', JSON.stringify(result, null, 2));
            if (result.success) {
                console.log('✅ Success! The IP whitelisting seems to have worked.');
            }
            else {
                console.log('❌ Failed. Error details:', result.error);
            }
        }
        catch (error) {
            console.error('💥 Unexpected Error:', error.message);
        }
    });
}
testPalmKash();
