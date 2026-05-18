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
// async function rechargePipingGasMeter(meterNo: string, amount: number) {
//     // 1. Call login API
//     const loginPayload = {
//       action: "lorawanMeter",
//       method: "toLogin",
//       params: {
//         username: "Rwanda_Kayitare",
//         password: "123456"
//       }
//     };
//     const loginResponse = await axios.post(
//       "http://english.energyy.ucskype.com/api/commonInternal.jsp",
//       `requestParams=${encodeURIComponent(JSON.stringify(loginPayload))}`,
//       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//     );
//     // 2. Extract apiToken
//     const apiToken = loginResponse.data?.value?.apiToken;
//     if (!apiToken) {
//         throw new Error("Failed to get API Token from Login");
//     }
//     // 3. Call recharge API
//     const rechargePayload = {
//       action: "lorawanMeter",
//       method: "recharge",
//       params: {
//         meterNo: meterNo,
//         amount: String(amount),
//         apiToken: apiToken
//       }
//     };
//     const rechargeResponse = await axios.post(
//       "http://english.energyy.ucskype.com/api/commonInternal.jsp",
//       `requestParams=${encodeURIComponent(JSON.stringify(rechargePayload))}`,
//       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//     );
//     // 4. Return response
//     return rechargeResponse.data;
// }
function getPipingMeterInfo(imei) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const baseUrl = process.env.LORAWAN_BASE_URL || 'http://english.energyy.ucskype.com';
        const username = process.env.LORAWAN_USERNAME || 'Rwanda_Kayitare';
        const password = process.env.LORAWAN_PASSWORD || '123456';
        const loginPayload = {
            action: "lorawanMeter",
            method: "toLogin",
            params: { username, password }
        };
        const loginResponse = yield axios_1.default.post(`${baseUrl}/api/commonInternal.jsp`, `requestParams=${encodeURIComponent(JSON.stringify(loginPayload))}`, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
        const apiToken = (_b = (_a = loginResponse.data) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.apiToken;
        if (!apiToken) {
            throw new Error("Failed to get API Token from Login");
        }
        const payload = {
            action: "zlMeter",
            method: "getMeterInfo",
            apiToken: apiToken,
            param: {
                imei: imei,
                nbonetNetImei: imei
            }
        };
        const response = yield axios_1.default.post(`${baseUrl}/api/commonInternal.jsp`, `requestParams=${encodeURIComponent(JSON.stringify(payload))}`, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
        return response.data;
    });
}
function callPipingMeterApi(params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
        // NOTE: For GPRS meters, 'devEui' holds the 16-char hex 'METER_KEY' or the IMEI number
        const baseUrl = process.env.LORAWAN_BASE_URL || 'http://english.energyy.ucskype.com';
        const username = process.env.LORAWAN_USERNAME || 'Rwanda_Kayitare';
        const password = process.env.LORAWAN_PASSWORD || '123456';
        const loginPayload = {
            action: "lorawanMeter",
            method: "toLogin",
            params: { username, password }
        };
        const loginResponse = yield axios_1.default.post(`${baseUrl}/api/commonInternal.jsp`, `requestParams=${encodeURIComponent(JSON.stringify(loginPayload))}`, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
        const apiToken = (_b = (_a = loginResponse.data) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.apiToken;
        if (!apiToken) {
            throw new Error("Failed to get API Token from Login");
        }
        if (!params.token) {
            let respData = null;
            // --- ATTEMPT 1: zlMeter + remotelyTopUp (GPRS meters use zlMeter action) ---
            try {
                console.log(`[PipingMeter] Attempt 1 (zlMeter/remotelyTopUp) for Identifier=${params.devEui}, amount=${params.amount}`);
                const payload1 = {
                    action: "zlMeter",
                    method: "remotelyTopUp",
                    apiToken: apiToken,
                    param: {
                        imei: params.devEui,
                        nbonetNetImei: params.devEui,
                        devEui: params.devEui,
                        meterNo: params.devEui,
                        meterId: params.devEui,
                        topUpAmount: String(params.amount || 0),
                        topUpToDeviceAmount: String(params.amount || 0)
                    }
                };
                console.log(`[PipingMeter] Attempt 1 payload:`, JSON.stringify(payload1));
                const resp1 = yield axios_1.default.post(`${baseUrl}/api/commonInternal.jsp`, `requestParams=${encodeURIComponent(JSON.stringify(payload1))}`, { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 20000 });
                console.log(`[PipingMeter] Attempt 1 RAW response:`, JSON.stringify(resp1.data));
                // Log to persistent file for troubleshooting
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const os = require('os');
                    const logMsg = `[PIPING-DEBUG] Attempt 1 Response: ${JSON.stringify(resp1.data)}\n`;
                    fs.appendFileSync(path.join(os.tmpdir(), 'backend_output.log'), logMsg);
                }
                catch (e) { }
                const msg1 = (((_c = resp1.data) === null || _c === void 0 ? void 0 : _c.msg) || ((_d = resp1.data) === null || _d === void 0 ? void 0 : _d.errmsg) || ((_e = resp1.data) === null || _e === void 0 ? void 0 : _e.message) || "").toLowerCase();
                if (((_f = resp1.data) === null || _f === void 0 ? void 0 : _f.errcode) === "0" || ((_g = resp1.data) === null || _g === void 0 ? void 0 : _g.errcode) === 0) {
                    console.log(`[PipingMeter] Attempt 1 SUCCESS`);
                    return resp1.data;
                }
                if (!msg1.includes("not found") && !msg1.includes("error") && ((_h = resp1.data) === null || _h === void 0 ? void 0 : _h.success)) {
                    console.log(`[PipingMeter] Attempt 1 SUCCESS (via success flag)`);
                    return resp1.data;
                }
                console.log(`[PipingMeter] Attempt 1 rejected: errcode=${(_j = resp1.data) === null || _j === void 0 ? void 0 : _j.errcode}, msg=${msg1}`);
                respData = resp1.data;
            }
            catch (err1) {
                console.error(`[PipingMeter] Attempt 1 HTTP error: ${err1.message}`);
            }
            // --- ATTEMPT 2: lorawanMeter + remotelyTopUp with imei ---
            try {
                console.log(`[PipingMeter] Attempt 2 (lorawanMeter/remotelyTopUp) for Identifier=${params.devEui}`);
                const payload2 = {
                    action: "lorawanMeter",
                    method: "remotelyTopUp",
                    apiToken: apiToken,
                    param: {
                        imei: params.devEui,
                        nbonetNetImei: params.devEui,
                        devEui: params.devEui,
                        meterNo: params.devEui,
                        meterId: params.devEui,
                        topUpAmount: String(params.amount || 0),
                        topUpToDeviceAmount: String(params.amount || 0)
                    }
                };
                console.log(`[PipingMeter] Attempt 2 payload:`, JSON.stringify(payload2));
                const resp2 = yield axios_1.default.post(`${baseUrl}/api/commonInternal.jsp`, `requestParams=${encodeURIComponent(JSON.stringify(payload2))}`, { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 20000 });
                console.log(`[PipingMeter] Attempt 2 RAW response:`, JSON.stringify(resp2.data));
                // Log to persistent file for troubleshooting
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const os = require('os');
                    const logMsg = `[PIPING-DEBUG] Attempt 2 Response: ${JSON.stringify(resp2.data)}\n`;
                    fs.appendFileSync(path.join(os.tmpdir(), 'backend_output.log'), logMsg);
                }
                catch (e) { }
                const msg2 = (((_k = resp2.data) === null || _k === void 0 ? void 0 : _k.msg) || ((_l = resp2.data) === null || _l === void 0 ? void 0 : _l.errmsg) || "").toLowerCase();
                if (((_m = resp2.data) === null || _m === void 0 ? void 0 : _m.errcode) === "0" || ((_o = resp2.data) === null || _o === void 0 ? void 0 : _o.errcode) === 0) {
                    console.log(`[PipingMeter] Attempt 2 SUCCESS`);
                    return resp2.data;
                }
                console.log(`[PipingMeter] Attempt 2 rejected: errcode=${(_p = resp2.data) === null || _p === void 0 ? void 0 : _p.errcode}, msg=${msg2}`);
                if (!respData)
                    respData = resp2.data;
            }
            catch (err2) {
                console.error(`[PipingMeter] Attempt 2 HTTP error: ${err2.message}`);
            }
            // --- ATTEMPT 3: zlMeter + recharge ---
            try {
                console.log(`[PipingMeter] Attempt 3 (zlMeter/recharge) for Identifier=${params.devEui}`);
                const payload3 = {
                    action: "zlMeter",
                    method: "recharge",
                    apiToken: apiToken,
                    param: {
                        imei: params.devEui,
                        nbonetNetImei: params.devEui,
                        devEui: params.devEui,
                        meterNo: params.devEui,
                        meterId: params.devEui,
                        amount: String(params.amount || 0)
                    }
                };
                console.log(`[PipingMeter] Attempt 3 payload:`, JSON.stringify(payload3));
                const resp3 = yield axios_1.default.post(`${baseUrl}/api/commonInternal.jsp`, `requestParams=${encodeURIComponent(JSON.stringify(payload3))}`, { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 20000 });
                console.log(`[PipingMeter] Attempt 3 RAW response:`, JSON.stringify(resp3.data));
                const msg3 = (((_q = resp3.data) === null || _q === void 0 ? void 0 : _q.msg) || ((_r = resp3.data) === null || _r === void 0 ? void 0 : _r.errmsg) || "").toLowerCase();
                if (((_s = resp3.data) === null || _s === void 0 ? void 0 : _s.errcode) === "0" || ((_t = resp3.data) === null || _t === void 0 ? void 0 : _t.errcode) === 0) {
                    console.log(`[PipingMeter] Attempt 3 SUCCESS`);
                    return resp3.data;
                }
                console.log(`[PipingMeter] Attempt 3 rejected: errcode=${(_u = resp3.data) === null || _u === void 0 ? void 0 : _u.errcode}, msg=${msg3}`);
                if (!respData)
                    respData = resp3.data;
            }
            catch (err3) {
                console.error(`[PipingMeter] Attempt 3 HTTP error: ${err3.message}`);
                if (respData)
                    return respData;
                throw err3;
            }
            // Return whatever last response we got for diagnosis
            console.log(`[PipingMeter] All attempts failed. Last response:`, JSON.stringify(respData));
            return respData || { success: false, errcode: "-1", msg: "All recharge attempts failed" };
        }
        // Token Push Mode requires 'zlMeter' and 'rechargeToken'
        const method = 'rechargeToken';
        const methodParams = {
            imei: params.devEui,
            token: params.token
        };
        const rechargePayload = {
            action: "zlMeter",
            method,
            apiToken: apiToken,
            param: methodParams
        };
        const rechargeResponse = yield axios_1.default.post(`${baseUrl}/api/commonInternal.jsp`, `requestParams=${encodeURIComponent(JSON.stringify(rechargePayload))}`, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
        return rechargeResponse.data;
    });
}
class PipingMeterService {
    rechargePipingMeter(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // If isVendByUnit is true, amount is already in m3. 
                // Otherwise, calculate m3 from RWF.
                const unitsAmount = params.isVendByUnit ? (params.amount || 0) : this.calculateUnits(params.amount || 0);
                // Fetch the correct identifier from DB
                const apiIdentifier = params.meterNumber;
                const apiParams = {
                    devEui: apiIdentifier,
                    amount: unitsAmount,
                    token: params.token
                };
                const response = yield callPipingMeterApi(apiParams);
                if (response && (response.success || response.errcode === "0" || response.errcode === 0)) {
                    return {
                        success: true,
                        meterNumber: params.meterNumber,
                        amount: params.amount,
                        units: unitsAmount,
                        apiReference: ((_a = response.value) === null || _a === void 0 ? void 0 : _a.id) || `PIPING-${Date.now()}`,
                        message: response.msg || response.errmsg || 'Piping Meter recharge successful',
                    };
                }
                else {
                    return {
                        success: false,
                        error: response.msg || response.errmsg || 'Piping API Rejection',
                    };
                }
            }
            catch (error) {
                return {
                    success: false,
                    error: error.message || 'Piping API call failed'
                };
            }
        });
    }
    /**
     * Specifically pushes a generated STS token to a GPRS meter via its IMEI.
     */
    pushTokenToImei(imei, token) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                console.log(`[PipingMeter] Pushing remote token to IMEI: ${imei}`);
                const apiParams = {
                    devEui: imei,
                    token: token
                };
                const response = yield callPipingMeterApi(apiParams);
                if (response && (response.success || response.errcode === "0" || response.errcode === 0)) {
                    return {
                        success: true,
                        meterNumber: imei,
                        message: response.msg || 'Token pushed successfully to GPRS meter',
                        apiReference: ((_a = response.value) === null || _a === void 0 ? void 0 : _a.id) || `PUSH-${Date.now()}`
                    };
                }
                else {
                    return {
                        success: false,
                        error: response.msg || response.errmsg || 'Remote push rejected by GPRS management system',
                    };
                }
            }
            catch (error) {
                return {
                    success: false,
                    error: error.message || 'Remote push failed'
                };
            }
        });
    }
    getMeterInfo(imei) {
        return __awaiter(this, void 0, void 0, function* () {
            return getPipingMeterInfo(imei);
        });
    }
    calculateUnits(amountRwf) {
        const ratePerM3 = Number(process.env.LORAWAN_RATE_PER_M3) || 850;
        return parseFloat((amountRwf / ratePerM3).toFixed(4));
    }
}
exports.default = new PipingMeterService();
