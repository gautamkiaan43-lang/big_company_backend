import axios from 'axios';

/**
 * Token Meter Service
 * 
 * Handles integration with Token-Based Prepaid Gas Meters.
 * Supports STS standard meters (Hunan Stron Smart Co., Ltd).
 * API Manual: API Application Manual for Vending (Hunan Stron Smart Co., Ltd)
 */

export interface TokenMeterRechargeParams {
    meterNumber: string;
    amount: number;       // Amount (money or units based on isVendByUnit)
    customerRef: string;  // Internal reference
    isVendByUnit?: boolean; // true = unit-based, false = money-based (default)
}

export interface TokenMeterRechargeResult {
    success: boolean;
    token?: string;          
    meterNumber?: string;
    amount?: number;
    units?: number;
    apiReference?: string;   
    message?: string;
    error?: string;
    raw?: any;               
}

class TokenMeterService {
    private apiBaseUrl: string;
    private companyName: string;
    private userName: string;
    private password: string;

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
    async rechargeTokenMeter(params: TokenMeterRechargeParams): Promise<TokenMeterRechargeResult> {
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
                "PassWord": this.password,              // Spec requires capital W
                "MeterID": params.meterNumber,
                "is_vend_by_unit": params.isVendByUnit === true, // Must be boolean, not 0/1
                "Amount": params.amount
            };

            const response = await axios.post(
                `${this.apiBaseUrl}/api/VendingMeter`,
                payload,
                {
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    timeout: 20000,
                    validateStatus: (status) => status < 500,
                }
            );

            console.log("STRONPOWER VendingMeter RESPONSE:", response.data);
            const result = this.handleResponse(response, params);

            // AUTO FALLBACK FOR UNREGISTERED METERS
            if (!result.success && result.error?.includes('Empty response')) {
                console.log(`[TokenMeter] Meter ${params.meterNumber} likely unregistered. Falling back to VendingMeterDirectly...`);
                return await this.directVendMeter(params);
            }

            return result;

        } catch (error: any) {
            return this.handleError(error);
        }
    }

    /**
     * ClearCredit: Set accumulated credit to zero.
     */
    async clearCredit(meterNumber: string, customerId: string): Promise<any> {
        return this.baseRequest('ClearCredit', { MeterID: meterNumber, CustomerId: customerId });
    }

    /**
     * ClearTamper: Clear tamper status on the meter.
     */
    async clearTamper(meterNumber: string, customerId: string): Promise<any> {
        return this.baseRequest('ClearTamper', { MeterID: meterNumber, CustomerId: customerId });
    }

    /**
     * QueryMeterInfo: Get basic meter information.
     */
    async queryMeterInfo(meterNumber: string): Promise<any> {
        return this.baseRequest('QueryMeterInfo', { MeterID: meterNumber }); // Spec uses MeterID, not MeterNo
    }

    /**
     * QueryMeterCredit: Get balance from the meter.
     */
    async queryMeterCredit(meterNumber: string): Promise<any> {
        return this.baseRequest('QueryMeterCredit', { MeterID: meterNumber });
    }

    /**
     * Base method for Stron API requests.
     */
    private async baseRequest(endpoint: string, extraFields: any): Promise<any> {
        try {
            const payload = {
                "CompanyName": this.companyName,
                "UserName": this.userName,
                "PassWord": this.password,          // capital W per spec
                ...extraFields
            };

            const response = await axios.post(
                `${this.apiBaseUrl}/api/${endpoint}`,
                payload,
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 15000
                }
            );
            return { success: response.status === 200, data: response.data };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private handleResponse(response: any, params: TokenMeterRechargeParams): TokenMeterRechargeResult {
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
        if (data?.Code !== undefined && data.Code !== 0 && data.Code !== 1) {
            return {
                success: false,
                error: `API Error Code ${data.Code}: ${data.Message || 'Authentication or parameter error'}`,
                raw: response.data
            };
        }
        
        // Extract token — Data.Token (nested) is the primary path per Stronpower spec
        const extractedToken = data?.Data?.Token || data?.Token || data?.token;

        if (extractedToken && String(extractedToken).trim() !== "") {
            return {
                success: true,
                token: String(extractedToken),
                meterNumber: params.meterNumber,
                amount: params.amount,
                units: data?.Units || data?.units || (params.isVendByUnit ? params.amount : this.calculateUnits(params.amount)),
                apiReference: data?.Reference || data?.reference || data?.transaction_id || `SP-${Date.now()}`,
                message: data?.Message || data?.message || 'Token generated successfully',
                raw: response.data
            };
        }

        return {
            success: false,
            error: data?.Message || data?.message || 'Token missing in response (Operation likely failed)',
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
    async directVendMeter(params: TokenMeterRechargeParams): Promise<TokenMeterRechargeResult> {
        try {
            const payload = {
                "CompanyName": this.companyName,
                "UserName": this.userName,
                "PassWord": this.password,         // capital W per spec
                "MeterId": params.meterNumber,     // lowercase 'd' — per spec for this endpoint
                "Amount": String(params.amount)    // string — per spec for this endpoint
            };

            const response = await axios.post(
                `${this.apiBaseUrl}/api/VendingMeterDirectly`,
                payload,
                {
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    timeout: 20000,
                    validateStatus: (status) => status < 500,
                }
            );

            console.log("STRONPOWER VendingMeterDirectly RESPONSE:", response.data);
            return this.handleResponse(response, params);

        } catch (error: any) {
            return this.handleError(error);
        }
    }

    private handleError(error: any): TokenMeterRechargeResult {
        console.error('[TokenMeter] API Error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.message || 'Failed to connect to Stron API',
            raw: error.response?.data
        };
    }

    private calculateUnits(amountRwf: number): number {
        const rate = Number(process.env.GAS_PRICE_PER_M3) || 1500;
        return parseFloat((amountRwf / rate).toFixed(4));
    }

    private generateLocalToken(): string {
        const digits = Array.from({ length: 20 }, () => Math.floor(Math.random() * 10)).join('');
        return digits.replace(/(\d{5})/g, '$1 ').trim();
    }

    /**
     * Legacy method preserved for compatibility, now wraps queryMeterInfo.
     */
    async validateMeter(meterNumber: string): Promise<{ success: boolean; error?: string; raw?: any }> {
        const res = await this.queryMeterInfo(meterNumber);
        if (res.success) {
            const data = Array.isArray(res.data) ? res.data[0] : res.data;
            if (!data || (!data.MeterNo && !data.Meter_id)) {
                return { success: false, error: 'Invalid meter number', raw: res.data };
            }
            return { success: true, raw: res.data };
        }
        return { success: false, error: res.error, raw: res.data };
    }
}

export default new TokenMeterService();
