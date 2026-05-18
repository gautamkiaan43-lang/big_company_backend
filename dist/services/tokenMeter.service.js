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
class TokenMeterService {
    constructor() {
        // OFFICIAL API URL: http://www.server-api.stronpower.com
        // Note: Manual says server-api, code was using server-newv
        this.apiBaseUrl = process.env.STRONPOWER_BASE_URL || 'http://www.server-api.stronpower.com';
        this.companyName = process.env.STRONPOWER_COMPANY_NAME || '';
        this.userName = process.env.STRONPOWER_USERNAME || '';
        this.password = process.env.STRONPOWER_PASSWORD || '';
    }
    /**
     * VendingMeter: Recharge a token meter.
     */
    rechargeTokenMeter(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const isDev = process.env.DEV_MODE === 'true' || process.env.DEV_MODE === '1';
            const isDemoMeter = process.env.ENABLE_DEMO_METER === 'true' && params.meterNumber.includes('399703');
            if (isDev || isDemoMeter) {
                console.log(`🛠️ [TokenMeter ${isDev ? 'DEV' : 'DEMO'}] Simulating token for meter: ${params.meterNumber}`);
                const fakeToken = this.generateLocalToken();
                const units = params.isVendByUnit ? params.amount : this.calculateUnits(params.amount);
                return {
                    success: true,
                    token: fakeToken,
                    meterNumber: params.meterNumber,
                    amount: params.amount,
                    units,
                    apiReference: `DEMO-TOKEN-${Date.now()}`,
                    message: `SUCCESS (Simulated). Token: ${fakeToken}`,
                    raw: { demo: true }
                };
            }
            try {
                // Some Stron systems use MeterID, others use MeterNo.
                // We use integer 0/1 for maximum compatibility.
                const payload = {
                    "CompanyName": this.companyName,
                    "UserName": this.userName,
                    "PassWord": this.password, // Spec requires capital W
                    "MeterID": params.meterNumber,
                    "is_vend_by_unit": params.isVendByUnit === true, // Must be boolean, not 0/1
                    "Amount": params.amount
                };
                const response = yield axios_1.default.post(`${this.apiBaseUrl}/api/VendingMeter`, payload, {
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    timeout: 20000,
                    validateStatus: (status) => status < 500,
                });
                console.log("STRONPOWER VendingMeter RESPONSE:", response.data);
                const result = this.handleResponse(response, params);
                // AUTO FALLBACK FOR UNREGISTERED METERS
                if (!result.success && ((_a = result.error) === null || _a === void 0 ? void 0 : _a.includes('Empty response'))) {
                    console.log(`[TokenMeter] Meter ${params.meterNumber} likely unregistered. Falling back to VendingMeterDirectly...`);
                    return yield this.directVendMeter(params);
                }
                return result;
            }
            catch (error) {
                return this.handleError(error);
            }
        });
    }
    /**
     * ClearCredit: Set accumulated credit to zero.
     */
    clearCredit(meterNumber, customerId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.baseRequest('ClearCredit', { MeterID: meterNumber, CustomerId: customerId });
        });
    }
    /**
     * ClearTamper: Clear tamper status on the meter.
     */
    clearTamper(meterNumber, customerId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.baseRequest('ClearTamper', { MeterID: meterNumber, CustomerId: customerId });
        });
    }
    /**
     * QueryMeterInfo: Get basic meter information.
     */
    queryMeterInfo(meterNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.baseRequest('QueryMeterInfo', { MeterID: meterNumber }); // Spec uses MeterID, not MeterNo
        });
    }
    /**
     * QueryMeterCredit: Get balance from the meter.
     */
    queryMeterCredit(meterNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.baseRequest('QueryMeterCredit', { MeterID: meterNumber });
        });
    }
    /**
     * Base method for Stron API requests.
     */
    baseRequest(endpoint, extraFields) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const payload = Object.assign({ "CompanyName": this.companyName, "UserName": this.userName, "PassWord": this.password }, extraFields);
                const response = yield axios_1.default.post(`${this.apiBaseUrl}/api/${endpoint}`, payload, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 15000
                });
                return { success: response.status === 200, data: response.data };
            }
            catch (error) {
                return { success: false, error: error.message };
            }
        });
    }
    handleResponse(response, params) {
        var _a;
        // Handle empty array response [] — meter is likely not registered
        if (Array.isArray(response.data) && response.data.length === 0) {
            return {
                success: false,
                error: 'Meter not found or system rejection (Empty response). Try VendingMeterDirectly for unregistered meters.',
                raw: response.data
            };
        }
        const data = Array.isArray(response.data) ? response.data[0] : response.data;
        // Check API-level error code (API can return HTTP 200 with Code != 0 on auth/logic failure)
        if ((data === null || data === void 0 ? void 0 : data.Code) !== undefined && data.Code !== 0 && data.Code !== 1) {
            return {
                success: false,
                error: `API Error Code ${data.Code}: ${data.Message || 'Authentication or parameter error'}`,
                raw: response.data
            };
        }
        // Extract token — Data.Token (nested) is the primary path per Stronpower spec
        const extractedToken = ((_a = data === null || data === void 0 ? void 0 : data.Data) === null || _a === void 0 ? void 0 : _a.Token) || (data === null || data === void 0 ? void 0 : data.Token) || (data === null || data === void 0 ? void 0 : data.token);
        if (extractedToken && String(extractedToken).trim() !== "") {
            return {
                success: true,
                token: String(extractedToken),
                meterNumber: params.meterNumber,
                amount: params.amount,
                units: (data === null || data === void 0 ? void 0 : data.Units) || (data === null || data === void 0 ? void 0 : data.units) || (params.isVendByUnit ? params.amount : this.calculateUnits(params.amount)),
                apiReference: (data === null || data === void 0 ? void 0 : data.Reference) || (data === null || data === void 0 ? void 0 : data.reference) || (data === null || data === void 0 ? void 0 : data.transaction_id) || `SP-${Date.now()}`,
                message: (data === null || data === void 0 ? void 0 : data.Message) || (data === null || data === void 0 ? void 0 : data.message) || 'Token generated successfully',
                raw: response.data
            };
        }
        return {
            success: false,
            error: (data === null || data === void 0 ? void 0 : data.Message) || (data === null || data === void 0 ? void 0 : data.message) || 'Token missing in response (Operation likely failed)',
            raw: response.data
        };
    }
    /**
     * VendingMeterDirectly: Recharge an UNREGISTERED token meter.
     * Use this when VendingMeter returns an empty [] response.
     * Key differences from VendingMeter:
     *   - Endpoint: /api/VendingMeterDirectly
     *   - Field: MeterId (lowercase 'd')
     *   - Amount: must be a string
     *   - No is_vend_by_unit field
     */
    directVendMeter(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const payload = {
                    "CompanyName": this.companyName,
                    "UserName": this.userName,
                    "PassWord": this.password, // capital W per spec
                    "MeterId": params.meterNumber, // lowercase 'd' — per spec for this endpoint
                    "Amount": String(params.amount) // string — per spec for this endpoint
                };
                const response = yield axios_1.default.post(`${this.apiBaseUrl}/api/VendingMeterDirectly`, payload, {
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    timeout: 20000,
                    validateStatus: (status) => status < 500,
                });
                console.log("STRONPOWER VendingMeterDirectly RESPONSE:", response.data);
                return this.handleResponse(response, params);
            }
            catch (error) {
                return this.handleError(error);
            }
        });
    }
    handleError(error) {
        var _a, _b, _c, _d;
        console.error('[TokenMeter] API Error:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        return {
            success: false,
            error: ((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || error.message || 'Failed to connect to Stron API',
            raw: (_d = error.response) === null || _d === void 0 ? void 0 : _d.data
        };
    }
    calculateUnits(amountRwf) {
        const rate = Number(process.env.GAS_PRICE_PER_M3) || 1500;
        return parseFloat((amountRwf / rate).toFixed(4));
    }
    generateLocalToken() {
        const digits = Array.from({ length: 20 }, () => Math.floor(Math.random() * 10)).join('');
        return digits.replace(/(\d{5})/g, '$1 ').trim();
    }
    /**
     * Legacy method preserved for compatibility, now wraps queryMeterInfo.
     */
    validateMeter(meterNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.queryMeterInfo(meterNumber);
            if (res.success) {
                const data = Array.isArray(res.data) ? res.data[0] : res.data;
                if (!data || (!data.MeterNo && !data.Meter_id)) {
                    return { success: false, error: 'Invalid meter number', raw: res.data };
                }
                return { success: true, raw: res.data };
            }
            return { success: false, error: res.error, raw: res.data };
        });
    }
}
exports.default = new TokenMeterService();
