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
class ZhongyiMeterService {
    constructor() {
        this.baseUrl = (process.env.ZHONGYI_BASE_URL || 'http://token.zhongyismart.com/open-api/v1').replace(/\/$/, '');
        this.http = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
        });
    }
    /**
     * Fetch credentials from environment
     */
    get credentials() {
        return {
            appId: process.env.ZHONGYI_APP_ID || '',
            token: process.env.ZHONGYI_TOKEN || ''
        };
    }
    /**
     * Generates a dynamic Date-Formatted TID based on current time.
     * Required format for this account: yyyy-MM-ddTHH:mm (e.g., 2026-04-03T18:10)
     */
    generateTID() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const MM = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const HH = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        return `${yyyy}-${MM}-${dd}T${HH}:${mm}`;
    }
    /**
     * Sanitizes meter numbers (removes non-digits)
     */
    sanitizeMeterNo(meterNo) {
        return String(meterNo || '').trim().replace(/[^0-9]/g, '');
    }
    /**
     * Registers a meter number in the STS system.
     * Treats code 0 (Success) and 1030004001 (Duplicate) as non-blocking success.
     */
    registerMeter(meterNo) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const { appId, token } = this.credentials;
            const sanitizedNo = this.sanitizeMeterNo(meterNo);
            console.log(`[ZHONGYI-API] [REGISTER] Initiating check/registration for: ${sanitizedNo}`);
            try {
                const response = yield this.http.post('/sts/meter/create', {
                    meterNo: sanitizedNo,
                    appId: String(appId), // Using String appId as per user JSON
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const code = (_a = response.data) === null || _a === void 0 ? void 0 : _a.code;
                const message = ((_b = response.data) === null || _b === void 0 ? void 0 : _b.msg) || 'No message';
                // Code 0: Success, Code 1030004001: Already exists
                if (code === 0 || code === 1030004001 || code === '0' || code === '1030004001') {
                    console.log(`[ZHONGYI-API] [REGISTER] Success/Existing: ${sanitizedNo} (Code: ${code})`);
                    return true;
                }
                console.warn(`[ZHONGYI-API] [REGISTER] Non-success code: ${code} - ${message}`);
                return false;
            }
            catch (err) {
                console.error(`[ZHONGYI-API] [REGISTER] Error: ${((_d = (_c = err.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.msg) || err.message}`);
                // Return true to allow recharge attempt anyway (failsafe)
                return true;
            }
        });
    }
    /**
     * Queries meter information or validates existence.
     * For STSv1, we use a registration check as a validation step.
     */
    queryMeter(meterNo) {
        return __awaiter(this, void 0, void 0, function* () {
            const isRegistered = yield this.registerMeter(meterNo);
            if (isRegistered) {
                return {
                    success: true,
                    meterNo: this.sanitizeMeterNo(meterNo),
                    status: 'ACTIVE',
                    message: 'Meter validated/registered'
                };
            }
            return {
                success: false,
                error: 'Meter validation failed'
            };
        });
    }
    /**
     * Main Recharge Logic with EXACT JSON Format (All Strings)
     */
    rechargeMeter(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            const { appId, token } = this.credentials;
            const meterNumber = this.sanitizeMeterNo(params.meterNumber);
            const orderId = params.customerRef;
            console.log(`[ZHONGYI-API] [RECHARGE] Starting: meter=${meterNumber}, amount=${params.amount}`);
            // 1. SAFE METER REGISTRATION (Non-blocking)
            yield this.registerMeter(meterNumber);
            // 2. CLEAN REQUEST BODY (EXACT USER FORMAT: All Strings, subClass: "2")
            const requestBody = {
                meterNo: String(meterNumber),
                amount: String(params.amount),
                appId: String(appId),
                tid: String(this.generateTID()), // Date-formatted Dynamic String
                subClass: "2", // Mandatory user requirement
                tokenClass: "0",
                tokenType: "0",
                pwrLimit: "0",
                pwrControl: "0"
            };
            let lastError = 'Recharge failed';
            let finalResponse = null;
            // 3. EXECUTE RECHARGE REQUEST
            try {
                const endpoint = '/sts/token/create';
                console.log(`[ZHONGYI-API] [RECHARGE] Attempting Endpoint: ${endpoint}`);
                console.log(`[ZHONGYI-API] [RECHARGE] Sending request to: ${this.baseUrl}${endpoint}`);
                console.log(`[ZHONGYI-API] [RECHARGE] Final Payload to Zhongyi:`, JSON.stringify(requestBody, null, 2));
                const response = yield this.http.post(endpoint, requestBody, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log(`[ZHONGYI-API] [RECHARGE] Full Response:`, JSON.stringify(response.data, null, 2));
                if (((_a = response.data) === null || _a === void 0 ? void 0 : _a.code) === 0 || ((_b = response.data) === null || _b === void 0 ? void 0 : _b.code) === '0') {
                    finalResponse = response.data;
                }
                else {
                    lastError = ((_c = response.data) === null || _c === void 0 ? void 0 : _c.msg) || `Endpoint ${endpoint} returned code ${(_d = response.data) === null || _d === void 0 ? void 0 : _d.code}`;
                    console.warn(`[ZHONGYI-API] [RECHARGE] Rejection: ${lastError}`);
                }
            }
            catch (err) {
                lastError = ((_f = (_e = err.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.msg) || err.message;
                console.error(`[ZHONGYI-API] [RECHARGE] Connection error:`, lastError);
            }
            // 4. RESPONSE HANDLING AND ROBUST TOKEN EXTRACTION
            if (finalResponse) {
                const dataField = finalResponse.data;
                let extractedToken = null;
                let extractedUnits = null;
                let extractedId = null;
                if (dataField && typeof dataField === 'object') {
                    // EXHAUSTIVE KEY SEARCH (based on confirmed Postman response: tokenNo)
                    const tokenKeys = ['tokenNo', 'token', 'Token', 'stsToken', 'StsToken', 'ststoken', 'rechargeToken', 'tokenValue', 'tokenNumber'];
                    for (const key of tokenKeys) {
                        if (dataField[key]) {
                            extractedToken = String(dataField[key]);
                            break;
                        }
                    }
                    // Metadata extraction
                    extractedUnits = Number(dataField.units || dataField.quantity || dataField.gas || 0);
                    extractedId = String(dataField.id || dataField.orderId || dataField.serialNo || dataField.transactionId || '');
                }
                else if (dataField && (typeof dataField === 'string' || typeof dataField === 'number')) {
                    // If data is just the token string itself
                    extractedToken = String(dataField);
                }
                // DETAILED DEBUG LOGGING IF TOKEN IS NULL
                if (!extractedToken && dataField) {
                    console.warn(`[ZHONGYI-API] [EXTRACTION-FAILED] Token not found in data field.`);
                    console.log(`[ZHONGYI-API] [EXTRACTION-FAILED] Available Keys in Data:`, Object.keys(dataField));
                    console.log(`[ZHONGYI-API] [EXTRACTION-FAILED] Full Data Object:`, JSON.stringify(dataField, null, 2));
                }
                else {
                    console.log(`[ZHONGYI-API] [RECHARGE] Success extraction. Token: ${extractedToken ? 'FOUND' : 'MISSING'}`);
                }
                return {
                    success: true,
                    token: extractedToken,
                    meterNumber: meterNumber,
                    amount: params.amount,
                    units: extractedUnits || (params.isVendByUnit ? params.amount : this.calculateUnits(params.amount)),
                    apiReference: extractedId || String(orderId),
                    message: finalResponse.msg || 'Recharge successful',
                    raw: finalResponse
                };
            }
            // 5. FAILSAFE ERROR RETURN
            return {
                success: false,
                error: lastError,
                meterNumber: meterNumber,
                amount: params.amount,
                message: lastError
            };
        });
    }
    /** 1,100 RWF ≈ 1 m3 Piped Gas (Conversion rate) */
    calculateUnits(amountRwf) {
        const rate = Number(process.env.GAS_PRICE_PER_M3) || 1500;
        return parseFloat((amountRwf / rate).toFixed(4));
    }
}
exports.default = new ZhongyiMeterService();
