/**
 * Gas Lorawan Service
 *
 * Handles integration with Piping Gas Meters via the Lorawan API.
 *
 * API Base : http://english.energyy.ucskype.com
 * Endpoint : POST /api/commonInternal.jsp
 * Body     : x-www-form-urlencoded  { requestParams: JSON string }
 *
 * Real response envelope (confirmed by live test):
 *   { "errcode": "0", "errmsg": "...", "value": { ... } }
 *   errcode "0" = success, anything else = failure.
 *
 * Flow:
 *   1. login()             → POST toLogin       → cache apiToken from value.apiToken
 *   2. getMeterInfo()      → POST getAreaArchiveInfo → return value (meter details)
 *   3. rechargeMeter()     → POST remotelyTopUp → return orderId from value
 *   4. getRechargeStatus() → POST getRechargeOrderInfo → return status from value
 *
 * Status codes (getRechargeStatus):
 *   0 = waiting  |  1 = processing  |  2 = success  |  3 = failed
 */

const axios = require('axios');
const qs = require('querystring');

// ─── In-memory token cache ────────────────────────────────────────────────────
let cachedToken = null;
let tokenFetchedAt = null;
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 min (API token typically valid 1 h)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBaseUrl() {
    return (process.env.LORAWAN_BASE_URL || 'http://english.energyy.ucskype.com').replace(/\/$/, '');
}

/**
 * Encode payload as x-www-form-urlencoded with requestParams = JSON string.
 */
function buildBody(jsonPayload) {
    return qs.stringify({ requestParams: JSON.stringify(jsonPayload) });
}

/**
 * POST to /api/commonInternal.jsp.
 * Returns the full parsed response body.
 * Throws on network/HTTP errors.
 */
async function lorawanRequest(payload) {
    const url = `${getBaseUrl()}/api/commonInternal.jsp`;

    console.log("Lorawan payload:", payload);

    const response = await axios.post(url, buildBody(payload), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
        },
        timeout: 20000,
        validateStatus: (status) => status < 500,
    });

    console.log("Lorawan response:", response.data);

    if (response.status >= 400) {
        throw new Error(`Lorawan HTTP error ${response.status}: ${JSON.stringify(response.data)}`);
    }

    return response.data;
}

/**
 * Check the API-level errcode field.
 * The API returns errcode "0" (string) for success.
 */
function isApiSuccess(data) {
    return data?.errcode === '0' || data?.errcode === 0;
}

/**
 * Extract a human-readable error message from the API response.
 */
function getApiError(data) {
    return data?.errmsg || data?.message || data?.msg || `API error (errcode: ${data?.errcode})`;
}

// ─── STEP 1: Login ────────────────────────────────────────────────────────────

/**
 * Login to the Lorawan API.
 * Caches the returned apiToken in memory for TOKEN_TTL_MS milliseconds.
 *
 * @returns {Promise<string>} apiToken
 */
async function login() {
    const username = process.env.LORAWAN_USERNAME || '';
    const password = process.env.LORAWAN_PASSWORD || '';

    if (!username || !password) {
        throw new Error('LORAWAN_USERNAME and LORAWAN_PASSWORD must be configured in .env');
    }

    const payload = {
        action: 'lorawanMeter',
        method: 'toLogin',
        params: { username, password },
    };

    console.log('[Lorawan] Logging in as', username, '...');
    const data = await lorawanRequest(payload);

    if (!isApiSuccess(data)) {
        throw new Error(`Lorawan login failed: ${getApiError(data)}`);
    }

    // Real response: { errcode:"0", errmsg:"Login successfully", value: { apiToken:"...", ... } }
    const token = data?.value?.apiToken;

    if (!token) {
        console.error('[Lorawan] Login response (no token):', JSON.stringify(data));
        throw new Error('Lorawan login succeeded but apiToken was not found in response.value');
    }

    cachedToken = token;
    tokenFetchedAt = Date.now();
    console.log('[Lorawan] Login successful. Token cached.');
    return token;
}

/**
 * Return a valid apiToken, refreshing it if expired or missing.
 */
async function getToken() {
    const isExpired = !tokenFetchedAt || (Date.now() - tokenFetchedAt) > TOKEN_TTL_MS;
    if (!cachedToken || isExpired) {
        await login();
    }
    return cachedToken;
}

// ─── STEP 2: Validate / Get Meter Info ───────────────────────────────────────

/**
 * Validate that a meter exists and return its archive info.
 * Maps to: method = getAreaArchiveInfo
 *
 * @param {string} devEui - The meter's device EUI (meter number entered by user)
 * @returns {Promise<{ success: boolean, data?: any, error?: string, raw?: any }>}
 */
async function getMeterInfo(devEui) {
    try {
        const apiToken = await getToken();

        const payload = {
            action: 'lorawanMeter',
            method: 'getAreaArchiveInfo',
            apiToken,
            param: { deveui: devEui },
        };

        console.log(`[Lorawan] getAreaArchiveInfo devEui=${devEui}`);
        const data = await lorawanRequest(payload);

        if (!isApiSuccess(data)) {
            // Token may have been invalidated server-side — force re-login next call
            if (String(data?.errcode) === '401' || String(data?.errmsg).toLowerCase().includes('token')) {
                cachedToken = null;
                tokenFetchedAt = null;
            }
            return { success: false, error: getApiError(data), raw: data };
        }

        const meterData = data?.value;

        // Empty value or empty list means meter not found
        if (!meterData || (Array.isArray(meterData) && meterData.length === 0)) {
            return { success: false, error: 'Meter not found in Lorawan system.', raw: data };
        }

        return { success: true, data: meterData, raw: data };

    } catch (err) {
        console.error('[Lorawan] getMeterInfo error:', err.message);
        if (err.message?.toLowerCase().includes('token')) {
            cachedToken = null;
            tokenFetchedAt = null;
        }
        return { success: false, error: err.message };
    }
}

// ─── STEP 3: Recharge Meter ───────────────────────────────────────────────────

/**
 * Initiate a direct top-up on a piping gas meter.
 * Maps to: method = remotelyTopUp
 *
 * @param {string}        devEui - The meter's device EUI
 * @param {number|string} amount - Top-up amount (e.g. RWF value)
 * @returns {Promise<{ success: boolean, orderId?: string, error?: string, raw?: any }>}
 */
async function rechargeMeter(devEui, amount) {
    try {
        const apiToken = await getToken();
        const topUpAmount = String(amount);

        const payload = {
            action: 'lorawanMeter',
            method: 'remotelyTopUp',
            apiToken,
            param: {
                deveui: devEui,
                topUpAmount,
                topUpToDeviceAmount: topUpAmount,
            },
        };

        console.log(`[Lorawan] remotelyTopUp devEui=${devEui} amount=${topUpAmount}`);
        const data = await lorawanRequest(payload);

        if (!isApiSuccess(data)) {
            if (String(data?.errcode) === '401' || String(data?.errmsg).toLowerCase().includes('token')) {
                cachedToken = null;
                tokenFetchedAt = null;
            }
            return { success: false, error: getApiError(data), raw: data };
        }

        // Extract orderId — may be at value.orderId or value directly as string
        const value = data?.value;
        const orderId = value?.orderId || value?.order_id || (typeof value === 'string' ? value : null);

        if (!orderId) {
            console.error('[Lorawan] remotelyTopUp response (no orderId):', JSON.stringify(data));
            return {
                success: false,
                error: 'Recharge submitted but orderId was not returned. See server logs.',
                raw: data,
            };
        }

        console.log(`[Lorawan] Recharge accepted. orderId=${orderId}`);
        return { success: true, orderId: String(orderId), raw: data };

    } catch (err) {
        console.error('[Lorawan] rechargeMeter error:', err.message);
        if (err.message?.toLowerCase().includes('token')) {
            cachedToken = null;
            tokenFetchedAt = null;
        }
        return { success: false, error: err.message };
    }
}

// ─── STEP 4: Check Recharge Status ───────────────────────────────────────────

/**
 * Check the status of a previously submitted recharge order.
 * Maps to: method = getRechargeOrderInfo
 *
 * Status codes:
 *   0 = waiting  |  1 = processing  |  2 = success  |  3 = failed
 *
 * @param {string} orderId - The orderId returned by rechargeMeter()
 * @returns {Promise<{ success: boolean, status?: number, statusLabel?: string, data?: any, error?: string }>}
 */
async function getRechargeStatus(orderId) {
    try {
        const apiToken = await getToken();

        const payload = {
            action: 'lorawanMeter',
            method: 'getRechargeOrderInfo',
            apiToken,
            param: { orderId },
        };

        console.log(`[Lorawan] getRechargeOrderInfo orderId=${orderId}`);
        const data = await lorawanRequest(payload);

        if (!isApiSuccess(data)) {
            if (String(data?.errcode) === '401' || String(data?.errmsg).toLowerCase().includes('token')) {
                cachedToken = null;
                tokenFetchedAt = null;
            }
            return { success: false, error: getApiError(data), raw: data };
        }

        const orderData = data?.value;
        const statusCode = orderData?.status ?? orderData?.orderStatus;

        const STATUS_LABELS = { 0: 'waiting', 1: 'processing', 2: 'success', 3: 'failed' };
        const statusLabel = STATUS_LABELS[statusCode] ?? 'unknown';

        console.log(`[Lorawan] Order ${orderId} status: ${statusCode} (${statusLabel})`);

        return {
            success: true,
            status: statusCode,
            statusLabel,
            data: orderData,
            raw: data,
        };

    } catch (err) {
        console.error('[Lorawan] getRechargeStatus error:', err.message);
        if (err.message?.toLowerCase().includes('token')) {
            cachedToken = null;
            tokenFetchedAt = null;
        }
        return { success: false, error: err.message };
    }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = { login, getMeterInfo, rechargeMeter, getRechargeStatus };
