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
dotenv_1.default.config();
const sms_service_1 = require("./services/sms.service");
const template_service_1 = require("./services/template.service");
const prisma_1 = __importDefault(require("./utils/prisma"));
function testZeroAmountSMS() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚀 Starting Zero Amount SMS Test...');
        const testPhone = '0788881264'; // Developer testing phone
        const templateName = 'customer-wallet-topup'; // Template with amount
        const testData = {
            customer_name: 'Suleyiman',
            amount: '0',
            new_balance: '100000',
            transaction_id: 'TX-ZERO-000'
        };
        try {
            // 1. Resolve template content using TemplateService
            console.log(`📋 Compiling template "${templateName}" with 0 amount...`);
            const compiled = yield template_service_1.TemplateService.getTemplate(templateName, testData);
            const plainText = compiled.html.replace(/<[^>]*>?/gm, ''); // Strip any HTML tags
            console.log(`💬 Compiled Message: "${plainText}"`);
            // 2. Send SMS using SMSService
            console.log(`📡 Sending SMS to ${testPhone}...`);
            const result = yield sms_service_1.SMSService.sendSMS(testPhone, plainText, templateName, { type: 'ZERO_AMOUNT_TEST', id: '1' });
            console.log('--------------------------------------------------');
            if (result.success) {
                console.log('✅ GATEWAY SUCCESS!');
                console.log('Message ID:', result.messageId);
                console.log('Cost:', result.messageId ? 'Charged successfully' : 'N/A');
            }
            else {
                console.log('❌ GATEWAY RETURNED ERROR:');
                console.log('Error:', result.error);
            }
            console.log('--------------------------------------------------');
        }
        catch (error) {
            console.error('💥 SYSTEM ERROR:', error.message);
        }
        finally {
            yield prisma_1.default.$disconnect();
            process.exit(0);
        }
    });
}
testZeroAmountSMS();
