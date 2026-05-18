import prisma from '../utils/prisma';
import axios from 'axios';

export interface PipingMeterRechargeParams {
    meterNumber: string;
    amount?: number;       // Now optional if token is provided
    token?: string;        // Added for token-based recharge
    customerRef: string;   // Internal tracking reference
    customerPhone?: string;
    isVendByUnit?: boolean; // New: support direct unit recharge
}

export interface PipingMeterRechargeResult {
    success: boolean;
    meterNumber?: string;
    amount?: number;
    units?: number;
    apiReference?: string;   // orderId from Lorawan API
    message?: string;
    error?: string;
}

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

async function getPipingMeterInfo(imei: string) {
    const baseUrl = process.env.LORAWAN_BASE_URL || 'http://english.energyy.ucskype.com';
    const username = process.env.LORAWAN_USERNAME || 'Rwanda_Kayitare';
    const password = process.env.LORAWAN_PASSWORD || '123456';

    const loginPayload = {
        action: "lorawanMeter",
        method: "toLogin",
        params: { username, password }
    };

    const loginResponse = await axios.post(
        `${baseUrl}/api/commonInternal.jsp`,
        `requestParams=${encodeURIComponent(JSON.stringify(loginPayload))}`,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const apiToken = loginResponse.data?.value?.apiToken;
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

    const response = await axios.post(
        `${baseUrl}/api/commonInternal.jsp`,
        `requestParams=${encodeURIComponent(JSON.stringify(payload))}`,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    return response.data;
}
async function callPipingMeterApi(params: { devEui: string, amount?: number, token?: string }) {
    // NOTE: For GPRS meters, 'devEui' holds the 16-char hex 'METER_KEY' or the IMEI number
    const baseUrl = process.env.LORAWAN_BASE_URL || 'http://english.energyy.ucskype.com';
    const username = process.env.LORAWAN_USERNAME || 'Rwanda_Kayitare';
    const password = process.env.LORAWAN_PASSWORD || '123456';

    const loginPayload = {
        action: "lorawanMeter",
        method: "toLogin",
        params: { username, password }
    };

    const loginResponse = await axios.post(
        `${baseUrl}/api/commonInternal.jsp`,
        `requestParams=${encodeURIComponent(JSON.stringify(loginPayload))}`,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const apiToken = loginResponse.data?.value?.apiToken;

    if (!apiToken) {
        throw new Error("Failed to get API Token from Login");
    }

    if (!params.token) {
        let respData: any = null;

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

            const resp1 = await axios.post(
                `${baseUrl}/api/commonInternal.jsp`,
                `requestParams=${encodeURIComponent(JSON.stringify(payload1))}`,
                { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 20000 }
            );

            console.log(`[PipingMeter] Attempt 1 RAW response:`, JSON.stringify(resp1.data));

            // Log to persistent file for troubleshooting
            try {
                const fs = require('fs');
                const path = require('path');
                const os = require('os');
                const logMsg = `[PIPING-DEBUG] Attempt 1 Response: ${JSON.stringify(resp1.data)}\n`;
                fs.appendFileSync(path.join(os.tmpdir(), 'backend_output.log'), logMsg);
            } catch (e) { }

            const msg1 = (resp1.data?.msg || resp1.data?.errmsg || resp1.data?.message || "").toLowerCase();
            if (resp1.data?.errcode === "0" || resp1.data?.errcode === 0) {
                console.log(`[PipingMeter] Attempt 1 SUCCESS`);
                return resp1.data;
            }
            if (!msg1.includes("not found") && !msg1.includes("error") && resp1.data?.success) {
                console.log(`[PipingMeter] Attempt 1 SUCCESS (via success flag)`);
                return resp1.data;
            }
            console.log(`[PipingMeter] Attempt 1 rejected: errcode=${resp1.data?.errcode}, msg=${msg1}`);
            respData = resp1.data;
        } catch (err1: any) {
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

            const resp2 = await axios.post(
                `${baseUrl}/api/commonInternal.jsp`,
                `requestParams=${encodeURIComponent(JSON.stringify(payload2))}`,
                { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 20000 }
            );

            console.log(`[PipingMeter] Attempt 2 RAW response:`, JSON.stringify(resp2.data));

            // Log to persistent file for troubleshooting
            try {
                const fs = require('fs');
                const path = require('path');
                const os = require('os');
                const logMsg = `[PIPING-DEBUG] Attempt 2 Response: ${JSON.stringify(resp2.data)}\n`;
                fs.appendFileSync(path.join(os.tmpdir(), 'backend_output.log'), logMsg);
            } catch (e) { }

            const msg2 = (resp2.data?.msg || resp2.data?.errmsg || "").toLowerCase();
            if (resp2.data?.errcode === "0" || resp2.data?.errcode === 0) {
                console.log(`[PipingMeter] Attempt 2 SUCCESS`);
                return resp2.data;
            }
            console.log(`[PipingMeter] Attempt 2 rejected: errcode=${resp2.data?.errcode}, msg=${msg2}`);
            if (!respData) respData = resp2.data;
        } catch (err2: any) {
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

            const resp3 = await axios.post(
                `${baseUrl}/api/commonInternal.jsp`,
                `requestParams=${encodeURIComponent(JSON.stringify(payload3))}`,
                { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 20000 }
            );

            console.log(`[PipingMeter] Attempt 3 RAW response:`, JSON.stringify(resp3.data));

            const msg3 = (resp3.data?.msg || resp3.data?.errmsg || "").toLowerCase();
            if (resp3.data?.errcode === "0" || resp3.data?.errcode === 0) {
                console.log(`[PipingMeter] Attempt 3 SUCCESS`);
                return resp3.data;
            }
            console.log(`[PipingMeter] Attempt 3 rejected: errcode=${resp3.data?.errcode}, msg=${msg3}`);
            if (!respData) respData = resp3.data;
        } catch (err3: any) {
            console.error(`[PipingMeter] Attempt 3 HTTP error: ${err3.message}`);
            if (respData) return respData;
            throw err3;
        }

        // Return whatever last response we got for diagnosis
        console.log(`[PipingMeter] All attempts failed. Last response:`, JSON.stringify(respData));
        return respData || { success: false, errcode: "-1", msg: "All recharge attempts failed" };
    }

    // Token Push Mode requires 'zlMeter' and 'rechargeToken'
    const method = 'rechargeToken';
    const methodParams: any = {
        imei: params.devEui,
        token: params.token
    };

    const rechargePayload = {
        action: "zlMeter",
        method,
        apiToken: apiToken,
        param: methodParams
    };

    const rechargeResponse = await axios.post(
        `${baseUrl}/api/commonInternal.jsp`,
        `requestParams=${encodeURIComponent(JSON.stringify(rechargePayload))}`,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    return rechargeResponse.data;
}

class PipingMeterService {

    async rechargePipingMeter(params: PipingMeterRechargeParams): Promise<PipingMeterRechargeResult> {
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

            const response = await callPipingMeterApi(apiParams);

            if (response && (response.success || response.errcode === "0" || response.errcode === 0)) {
                return {
                    success: true,
                    meterNumber: params.meterNumber,
                    amount: params.amount,
                    units: unitsAmount,
                    apiReference: response.value?.id || `PIPING-${Date.now()}`,
                    message: response.msg || response.errmsg || 'Piping Meter recharge successful',
                };
            } else {
                return {
                    success: false,
                    error: response.msg || response.errmsg || 'Piping API Rejection',
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Piping API call failed'
            };
        }
    }

    /**
     * Specifically pushes a generated STS token to a GPRS meter via its IMEI.
     */
    async pushTokenToImei(imei: string, token: string): Promise<PipingMeterRechargeResult> {
        try {
            console.log(`[PipingMeter] Pushing remote token to IMEI: ${imei}`);

            const apiParams = {
                devEui: imei,
                token: token
            };

            const response = await callPipingMeterApi(apiParams);

            if (response && (response.success || response.errcode === "0" || response.errcode === 0)) {
                return {
                    success: true,
                    meterNumber: imei,
                    message: response.msg || 'Token pushed successfully to GPRS meter',
                    apiReference: response.value?.id || `PUSH-${Date.now()}`
                };
            } else {
                return {
                    success: false,
                    error: response.msg || response.errmsg || 'Remote push rejected by GPRS management system',
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Remote push failed'
            };
        }
    }

    async getMeterInfo(imei: string) {
        return getPipingMeterInfo(imei);
    }

    private calculateUnits(amountRwf: number): number {
        const ratePerM3 = Number(process.env.LORAWAN_RATE_PER_M3) || 850;
        return parseFloat((amountRwf / ratePerM3).toFixed(4));
    }
}

export default new PipingMeterService();
