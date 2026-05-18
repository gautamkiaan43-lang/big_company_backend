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
const axios_1 = __importDefault(require("axios"));
class PalmKashService {
    constructor() {
        this.clientId = process.env.PALMKASH_CLIENT_ID || '';
        this.secretKey = process.env.PALMKASH_SECRET_KEY || '';
        this.env = process.env.PALMKASH_ENV || 'sandbox';
        this.baseUrl = process.env.PALMKASH_API_URL || 'https://dashboard.palmkash.com/api/v1';
    }
    /**
     * Get Authentication Token
     */
    getAccessToken() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                return "";
            }
            catch (error) {
                console.error('PalmKash Auth Error:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error('Failed to authenticate with PalmKash');
            }
        });
    }
    /**
     * Initiate Mobile Money Payment
     */
    initiatePayment(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const isDev = process.env.DEV_MODE === 'true' || process.env.DEV_MODE === '1';
            console.log(`🔌 [PalmKash] DEV_MODE config: "${process.env.DEV_MODE}", isDev: ${isDev}`);
            if (isDev) {
                console.log(`🛠️ [PalmKash DEV MODE] Bypassing real payment for ${params.phoneNumber}, Amount: ${params.amount}`);
                return {
                    success: true,
                    transactionId: `DEV-TXN-${Date.now()}`,
                    status: 'SUCCESS', // Simulate immediate success in DEV_MODE
                    message: 'Payment simulated (DEV_MODE active)'
                };
            }
            try {
                // Ensure phone number starts with 250 for Rwanda
                let phone = params.phoneNumber.replace(/\s+/g, ''); // Remove spaces
                if (phone.startsWith('0') && phone.length === 10) {
                    phone = '250' + phone.substring(1);
                }
                else if (phone.length === 9 || phone.length === 10) {
                    // If it's a 9 or 10 digit number without 250, add it
                    if (!phone.startsWith('250')) {
                        phone = '250' + phone;
                    }
                }
                console.log(`🚀 [PalmKash] Initiating payment for ${phone}, Amount: ${params.amount}`);
                // Official Endpoint
                const url = "https://dashboard.palmkash.com/api/v1/payments/make-payment";
                const callback_url = "https://big-company-production.up.railway.app/api/webhooks/palmkash";
                const requestBody = {
                    merchant_id: process.env.PALMKASH_CLIENT_ID,
                    client_reference: params.referenceId,
                    phone_number: phone,
                    amount: params.amount,
                    currency: "RWF",
                    callback_url: callback_url
                };
                const requestHeaders = {
                    'Authorization': `Bearer ${process.env.PALMKASH_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                };
                // DEBUG LOGS BEFORE REQUEST
                console.log('--- [PalmKash PRE-REQUEST DEBUG] ---');
                console.log('URL:', url);
                console.log('Headers:', JSON.stringify(requestHeaders, null, 2));
                console.log('Body:', JSON.stringify(requestBody, null, 2));
                console.log('------------------------------------');
                const response = yield axios_1.default.post(url, requestBody, {
                    headers: requestHeaders,
                    timeout: 15000,
                    validateStatus: (status) => status < 500
                });
                // DEBUG LOGS AFTER RESPONSE
                console.log('--- [PalmKash POST-RESPONSE DEBUG] ---');
                console.log('Status Code:', response.status);
                console.log('Response Headers:', JSON.stringify(response.headers, null, 2));
                console.log('Content-Type:', response.headers['content-type']);
                console.log('-------------------------------------');
                // Check for Cloudflare/Non-JSON response
                const contentType = response.headers['content-type'] || '';
                if (!contentType.includes('application/json')) {
                    console.error('❌ [PalmKash] Received non-JSON response (likely Cloudflare block)');
                    return {
                        success: false,
                        error: "PalmKash blocked request — server/IP not trusted yet",
                        status: "FAILED"
                    };
                }
                if (response.status >= 400) {
                    return {
                        success: false,
                        error: response.data.error || response.data.message || 'Payment initiation failed',
                        status: "FAILED",
                        transactionId: params.referenceId
                    };
                }
                return {
                    success: true,
                    transactionId: response.data.reference || response.data.transaction_id,
                    status: response.data.status || 'pending',
                    message: response.data.message || 'Payment initiated'
                };
            }
            catch (error) {
                console.error('PalmKash Payment Error:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                // If we still get a 500 or network error that wasn't caught by validateStatus
                const contentType = ((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.headers) === null || _c === void 0 ? void 0 : _c['content-type']) || '';
                if (error.response && !contentType.includes('application/json')) {
                    return {
                        success: false,
                        error: "PalmKash blocked request — server/IP not trusted yet",
                        status: "FAILED"
                    };
                }
                return {
                    success: false,
                    error: ((_e = (_d = error.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.message) || error.message || 'PalmKash connection failed',
                    status: "FAILED",
                    transactionId: params.referenceId
                };
            }
        });
    }
    /**
     * Verify Payment Status
     * Updated Endpoint: /payments/get-payment-status
     */
    verifyPayment(transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const response = yield axios_1.default.post(`${this.baseUrl}/payments/get-payment-status`, {
                    app_id: this.clientId,
                    app_secret: this.secretKey,
                    reference: transactionId
                }, {
                    headers: {
                        'Authorization': `Bearer ${this.secretKey}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                return response.data; // { status: 'SUCCESS' | 'FAILED' | 'PENDING', ... }
            }
            catch (error) {
                console.error('PalmKash Verify Error:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                return { status: 'ERROR', message: error.message };
            }
        });
    }
}
exports.default = new PalmKashService();
